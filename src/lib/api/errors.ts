export type ApiErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "file_too_large"
  | "unsupported_format"
  | "internal"
  | "network";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly field?: string;
  /** Segundos hasta poder reintentar (solo para `rate_limited`). */
  readonly retryAfterSeconds?: number;

  constructor(opts: {
    code: ApiErrorCode;
    message: string;
    status: number;
    field?: string;
    retryAfterSeconds?: number;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.field = opts.field;
    this.retryAfterSeconds = opts.retryAfterSeconds;
  }

  static fromResponse(
    status: number,
    body: unknown,
    opts?: { retryAfterSeconds?: number },
  ): ApiError {
    const b = (body ?? {}) as { code?: string; message?: string; field?: string };
    const code = (b.code as ApiErrorCode) ?? statusToCode(status);
    return new ApiError({
      code,
      message: b.message ?? defaultMessage(code, opts?.retryAfterSeconds),
      status,
      field: b.field,
      retryAfterSeconds: opts?.retryAfterSeconds,
    });
  }

  static network(message = "Sin conexión con el servidor"): ApiError {
    return new ApiError({ code: "network", message, status: 0 });
  }
}

function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status === 413) return "file_too_large";
  if (status === 415) return "unsupported_format";
  if (status >= 500) return "internal";
  return "internal";
}

function defaultMessage(code: ApiErrorCode, retryAfterSeconds?: number): string {
  switch (code) {
    case "validation":
      return "Datos inválidos";
    case "unauthorized":
      return "Sesión expirada";
    case "forbidden":
      return "No tenés permisos";
    case "not_found":
      return "No encontrado";
    case "conflict":
      return "Conflicto con el estado actual";
    case "rate_limited":
      if (retryAfterSeconds && retryAfterSeconds > 0) {
        return `Demasiados intentos. Reintentá en ${retryAfterSeconds}s.`;
      }
      return "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";
    case "file_too_large":
      return "Alguno de los archivos supera el límite (5 MB imágenes, 20 MB video).";
    case "unsupported_format":
      return "Solo se aceptan PNG, JPG, WebP y MP4.";
    case "network":
      return "Sin conexión con el servidor";
    case "internal":
      return "Error interno";
  }
}
