export type ApiErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal"
  | "network";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly field?: string;

  constructor(opts: { code: ApiErrorCode; message: string; status: number; field?: string }) {
    super(opts.message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.field = opts.field;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const b = (body ?? {}) as { code?: string; message?: string; field?: string };
    const code = (b.code as ApiErrorCode) ?? statusToCode(status);
    return new ApiError({
      code,
      message: b.message ?? defaultMessage(code),
      status,
      field: b.field,
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
  if (status >= 500) return "internal";
  return "internal";
}

function defaultMessage(code: ApiErrorCode): string {
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
    case "network":
      return "Sin conexión con el servidor";
    case "internal":
      return "Error interno";
  }
}
