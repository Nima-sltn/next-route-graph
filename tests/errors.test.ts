import assert from "node:assert";
import { test } from "node:test";
import {
  AmbiguousRouterError,
  NextRouteGraphError,
  NoAppRouterError,
  ProjectNotFoundError,
  RouteDirectoryReadError,
  RouteLintError,
} from "../src/errors/index.js";

test("NextRouteGraphError - proper inheritance and error codes", () => {
  const err1 = new ProjectNotFoundError("/fake/path");
  assert.ok(err1 instanceof Error);
  assert.ok(err1 instanceof NextRouteGraphError);
  assert.strictEqual(err1.code, "ERR_PROJECT_NOT_FOUND");
  assert.ok(err1.hint);

  const err2 = new AmbiguousRouterError();
  assert.strictEqual(err2.code, "ERR_AMBIGUOUS_ROUTER");

  const err3 = new NoAppRouterError();
  assert.strictEqual(err3.code, "ERR_NO_APP_ROUTER");

  const err4 = new RouteDirectoryReadError("/mock");
  assert.strictEqual(err4.code, "ERR_DIRECTORY_READ");

  const err5 = new RouteLintError(3);
  assert.strictEqual(err5.code, "ERR_ROUTE_LINT");
  assert.strictEqual(err5.errorCount, 3);
});
