import { Dictionary, forEach } from "lodash";
import swaggerV3 from "examples/swagger.v3.petstore.json";
import swaggerV3Expanded from "examples/swagger.v3.petstore.expanded.json";
import swaggerV2 from "examples/swagger.json";
import { SchemaHandler } from "src/core/SchemaHandler";

describe("SchemaHandler", () => {
  it("should scan swagger definitions schema correctly", () => {
    const results: Dictionary<any> = {};

    const r = SchemaHandler.of((k, ret) => {
      results[k] = ret;
    });

    forEach(swaggerV2.definitions as any, (v, k) => {
      return r.resolve({
        ...v,
        _name: k,
      });
    });

    expect(results).toEqual({
      ApiResponse: {
        "code?": "number",
        "message?": "string",
        "type?": "string",
      },
      Category: {
        "id?": "number",
        "name?": "string",
      },
      Order: {
        "complete?": "boolean",
        "id?": "number",
        "petId?": "number",
        "quantity?": "number",
        "shipDate?": "string",
        "status?": "keyof typeof OrderStatus#EnumSuffix",
      },
      "OrderStatus#EnumSuffix": ["placed", "approved", "delivered"],
      Pet: {
        "category?": "?name=Category&type=ref",
        "id?": "number",
        name: "string",
        photoUrls: "string[]",
        "status?": "keyof typeof PetStatus#EnumSuffix",
        "tags?": "?name=Tag&type=ref[]",
      },
      "PetStatus#EnumSuffix": ["available", "pending", "sold"],
      Tag: {
        "id?": "number",
        "name?": "string",
      },
      User: {
        "email?": "string",
        "firstName?": "string",
        "id?": "number",
        "lastName?": "string",
        "password?": "string",
        "phone?": "string",
        "userStatus?": "number",
        "username?": "string",
      },
    });
  });

  it("should scan swagger components schema correctly", () => {
    const results: Dictionary<any> = {};
    const r = SchemaHandler.of((k, ret) => {
      results[k] = ret;
    });

    forEach(swaggerV3.components.schemas as any, (v, k) =>
      r.resolve({
        ...v,
        _name: k,
      }),
    );

    expect(results).toEqual({
      Error: {
        code: "number",
        message: "string",
      },
      Pet: {
        id: "number",
        name: "string",
        "tag?": "string",
      },
      Pets: "?name=Pet&type=ref[]",
    });
  });

  it("should scan swagger components expanded schema correctly", () => {
    const results: Dictionary<any> = {};
    const r = SchemaHandler.of((k, ret) => {
      results[k] = ret;
    });

    forEach(swaggerV3Expanded.components.schemas as any, (v, k) =>
      r.resolve({
        ...v,
        _name: k,
      }),
    );

    expect(results).toEqual({
      Category: {
        "id?": "number",
        "name?": "string",
      },
      Error: {
        code: "number",
        message: "string",
      },
      NewPet: {
        name: "string",
        "tag?": "string",
      },
      Pet: {
        _extends: ["?name=NewPet&type=ref"],
        _others: {
          "categories?": "?name=Category&type=ref[]",
          id: "number",
        },
      },
      Pets: "?name=Pet&type=ref[]",
    });
  });

  it("should scan single schema correctly", () => {
    SchemaHandler.of((_, results) => {
      expect(results).toEqual("?name=Pet&type=ref[]");
    }).resolve({
      type: "array",
      items: {
        $ref: "#/components/schemas/Pet",
      },
    });

    const results1: any = {};
    SchemaHandler.of((k, v) => {
      results1[k] = v;
    }).resolve({
      type: "string",
      enum: ["AAA", "BBB"],
      _name: "Parent",
      _propKey: "PetStatus",
    });

    expect(results1).toEqual({
      Parent: "keyof typeof ParentPetStatus#EnumSuffix",
      "ParentPetStatus#EnumSuffix": ["AAA", "BBB"],
    });
  });

  it("should scan properties with enum", () => {
    const mockWriteTo = jest.fn();
    SchemaHandler.of(mockWriteTo).resolve({
      type: "object",
      properties: {
        visitsCount: {
          type: "array",
          example: ["ZERO"],
          items: {
            type: "string",
            enum: ["ZERO", "ONE", "TWO", "THREE", "MORE_THAN_THREE", "FOUR", "FIVE", "FIVE_OR_MORE"],
          },
        },
      },
    });

    expect(mockWriteTo).toHaveBeenNthCalledWith(1, "VisitsCount#EnumSuffix", [
      "ZERO",
      "ONE",
      "TWO",
      "THREE",
      "MORE_THAN_THREE",
      "FOUR",
      "FIVE",
      "FIVE_OR_MORE",
    ]);
  });

  it("should handle schema with `allOf` property", () => {
    const results: any = {};

    SchemaHandler.of((k, v) => {
      results[k] = v;
    }).resolve({
      _name: "Pet",
      allOf: [
        {
          $ref: "#/components/schemas/NewPet",
        },
        {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              format: "int64",
            },
          },
        },
      ],
    });

    expect(results).toEqual({
      Pet: {
        _extends: ["?name=NewPet&type=ref"],
        _others: {
          id: "number",
        },
      },
    });
  });

  it("should handle `allOf` property with extra enum property", () => {
    const results: any = {};

    SchemaHandler.of((k, v) => {
      results[k] = v;
    }).resolve({
      _name: "Dog",
      allOf: [
        {
          $ref: "#/components/schemas/Pet",
        },
        {
          type: "object",
          properties: {
            bark: {
              type: "boolean",
            },
            breed: {
              type: "string",
              enum: ["Dingo", "Husky", "Retriever", "Shepherd"],
            },
          },
        },
      ],
    });

    expect(results).toEqual({
      "Breed#EnumSuffix": ["Dingo", "Husky", "Retriever", "Shepherd"],
      Dog: {
        _extends: ["?name=Pet&type=ref"],
        _others: {
          "bark?": "boolean",
          "breed?": "keyof typeof Breed#EnumSuffix",
        },
      },
    });
  });

  it("should handle schema with `oneOf` property", () => {
    const results: any = {};

    SchemaHandler.of((k, v) => {
      results[k] = v;
    }).resolve({
      _name: "Pet",
      oneOf: [
        {
          $ref: "#/components/schemas/Cat",
        },
        {
          $ref: "#/components/schemas/Dog",
        },
      ],
    });

    expect(results).toEqual({
      Pet: {
        _oneOf: ["?name=Cat&type=ref", "?name=Dog&type=ref"],
      },
    });
  });
});
