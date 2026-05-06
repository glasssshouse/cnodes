export function computeNextVersion(
  version: string,
  bump: string,
  preid?: string,
): string;

export function promoteUnreleasedChangelog(
  changelog: string,
  version: string,
  date: string,
  options?: Readonly<{
    allowEmpty?: boolean;
  }>,
): string;

export function updateReadmeVersion(readme: string, version: string): string;
