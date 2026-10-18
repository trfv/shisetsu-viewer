export class MaintenanceWindowError extends Error {
  override readonly name = "MaintenanceWindowError";
}

export class TargetNotFoundError extends Error {
  override readonly name = "TargetNotFoundError";
}

export class PartialExtractionError extends Error {
  override readonly name = "PartialExtractionError";
}

export class ScrapeStructureError extends Error {
  override readonly name = "ScrapeStructureError";
}
