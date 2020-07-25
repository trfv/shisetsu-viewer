const INVALID_UUID = "00000000-0000-0000-0000-000000000000";

const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

export const isValidUUID = (uuid: string | undefined) => {
  return uuid && UUID_REGEX.test(uuid) && uuid !== INVALID_UUID;
};

export const fromUpperSnakeToLowerKebab = (upperSnake: string) => {
  return upperSnake.toLowerCase().replace(/_/g, "-");
};

export const fromLowerKebabToUpperSnake = (lowerKebab: string) => {
  return lowerKebab.toUpperCase().replace(/-/g, "_");
};
