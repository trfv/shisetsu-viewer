const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

export const isValidUuid = (uuid: string): boolean => {
  return !!(uuid && UUID_REGEX.test(uuid));
};
