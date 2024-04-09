// Parses the event body
export function parseBody(event) {
  let body = event.body || event;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }
  return body;
}
