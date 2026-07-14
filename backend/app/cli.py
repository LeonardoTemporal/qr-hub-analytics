from __future__ import annotations

import argparse
import asyncio
import getpass
import os

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.domains.admin.security import hash_password
from app.models import AdminUser
from app.uat import UATSeedResult, cleanup_uat, seed_uat


async def upsert_admin(username: str, password: str) -> None:
    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(select(AdminUser).where(AdminUser.username == username))
        ).scalar_one_or_none()
        if user:
            user.password_hash = hash_password(password)
            user.is_active = True
        else:
            session.add(
                AdminUser(
                    username=username,
                    password_hash=hash_password(password),
                    is_active=True,
                )
            )
        await session.commit()


async def create_admin_and_close(username: str, password: str) -> None:
    try:
        await upsert_admin(username, password)
    finally:
        await engine.dispose()


async def seed_uat_and_close(pin: str) -> UATSeedResult:
    try:
        return await seed_uat(pin)
    finally:
        await engine.dispose()


async def cleanup_uat_and_close() -> None:
    try:
        await cleanup_uat()
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)
    create_admin = subparsers.add_parser("create-admin")
    create_admin.add_argument("--username", default="admin")
    create_admin.add_argument("--password-env")
    seed_release_uat = subparsers.add_parser("seed-uat")
    seed_release_uat.add_argument("--pin-env", required=True)
    subparsers.add_parser("cleanup-uat")
    args = parser.parse_args()

    if args.command == "create-admin":
        password = os.getenv(args.password_env) if args.password_env else None
        password = password or getpass.getpass("Admin password: ")
        if len(password) < 12:
            raise SystemExit("Admin password must contain at least 12 characters")
        asyncio.run(create_admin_and_close(args.username, password))
        print(f"Admin user ready: {args.username}")
    elif args.command == "seed-uat":
        pin = os.getenv(args.pin_env)
        if not pin:
            raise SystemExit(f"Required environment variable is not set: {args.pin_env}")
        try:
            result = asyncio.run(seed_uat_and_close(pin))
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc
        print(
            "UAT fixture ready: "
            f"vehicle_id={result.vehicle_id} "
            f"showcase=/auto/{result.public_slug} "
            f"qr=/t/{result.qr_id}"
        )
    elif args.command == "cleanup-uat":
        asyncio.run(cleanup_uat_and_close())
        print("UAT fixture removed")


if __name__ == "__main__":
    main()
