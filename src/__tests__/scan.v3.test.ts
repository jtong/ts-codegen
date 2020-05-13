import swaggerV3 from "examples/openapi.json";
import { scan } from "src/scan";
import { IOpenAPI } from "src/__types__/OpenAPI";

describe("swagger v3", () => {
  it("should handle basic schemas correctly", () => {
    expect(scan(swaggerV3 as IOpenAPI, { typeWithPrefix: true })).toMatchSnapshot();
  });
});