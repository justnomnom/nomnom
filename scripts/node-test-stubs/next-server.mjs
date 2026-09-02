/**
 * Node-test stub for `next/server` (extensionless Next export).
 */
export class NextResponse {
  /**
   * @param {unknown} body
   * @param {{ status?: number, headers?: HeadersInit }} [init]
   */
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.headers = new Headers(init.headers);
    this.cookies = {
      set() {},
      get() {
        return undefined;
      },
      getAll() {
        return [];
      },
      delete() {},
    };
  }

  static json(data, init = {}) {
    return new NextResponse(JSON.stringify(data), {
      status: init.status ?? 200,
      headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    });
  }

  static redirect(url, status = 307) {
    return new NextResponse(null, { status, headers: { location: String(url) } });
  }

  static next() {
    return new NextResponse(null, { status: 200 });
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }
}

export class NextRequest {}

export function after(fn) {
  return fn();
}
