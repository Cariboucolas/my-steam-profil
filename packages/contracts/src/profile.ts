/**
 * A Profile as it travels over the wire: the SteamId value object is flattened
 * into the plain digits it wraps.
 */
export interface ProfileDto {
  readonly steamId: string;
  readonly personaName: string;
  readonly avatarUrl: string;
  readonly profileUrl: string;
}
