/**
 * Tipos compartidos para el dominio de campañas.
 * Un solo archivo de tipos evita imports circulares y es fácil de ampliar.
 */

export interface SocialLink {
  /** Clave única para React key prop */
  id: string;
  /** Texto visible en el botón */
  label: string;
  /** URL de destino */
  href: string;
  /**
   * Nombre del icono de lucide-react.
   * Se usa un string discriminado para que sea serializable desde una fuente
   * externa (API, CMS, env var) sin importar toda la librería de iconos.
   */
  icon: "MessageCircle" | "Instagram" | "Globe" | "Link" | "Phone" | "Mail";
  /** Clases Tailwind extra para el color de fondo del botón */
  colorClass?: string;
}

export interface CampaignData {
  /** Slug de la campaña, coincide con el campaign_id del QR */
  id: string;
  /** Nombre visible en la cabecera del perfil */
  displayName: string;
  /** Descripción corta */
  bio: string;
  /** URL de la imagen de avatar (puede ser externa o /public) */
  avatarUrl?: string;
  /** Lista ordenada de enlaces */
  links: SocialLink[];
}
