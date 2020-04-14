import { Schema } from "swagger-schema-official";
import { addPrefixForInterface, generateEnumType, isArray, isNumber, toCapitalCase } from "../../utils";
import { indexOf, map, reduce, some } from "lodash";
import { ISchema } from "src/swagger/v3/OpenAPI";

type TDictionary<T> = { [key: string]: T };
type TCustomSchema = (Schema | ISchema) & { _propKey?: string; _name?: string };
type TWriteTo = (k: string, v: any) => void;

export class SchemaResolver2 {
  static of(writeTo: TWriteTo) {
    return new SchemaResolver2(writeTo);
  }

  constructor(public writeTo: TWriteTo) {}

  resolve = (schema: TCustomSchema = {}) => {
    this.writeTo(schema._name!, this.toType(schema));
  };

  toType = (schema: TCustomSchema = {}): TDictionary<any> | string => {
    const oneOf = (schema as ISchema).oneOf;
    if (oneOf) {
      return this.toOneOfType(oneOf);
    }

    const anyOf = (schema as ISchema).anyOf;
    if (anyOf) {
      return this.toOneOfType(anyOf);
    }

    if (schema.$ref) {
      return this.toRefType(schema);
    }

    if (schema.items) {
      return this.toArrayType(schema);
    }

    if (schema.enum) {
      return this.toEnumType(schema);
    }

    if (schema.type === "object") {
      return this.toObjectType(schema);
    }

    if (schema.type === "integer") {
      return "number";
    }

    return schema.type || "";
  };

  toRefType = (schema: Schema | ISchema): string => {
    const getTypeByRef = (str?: string) => {
      if (!str) {
        return;
      }
      const list = str.split("/");
      return list[list.length - 1];
    };
    return addPrefixForInterface(toCapitalCase(getTypeByRef(schema.$ref)));
  };

  toArrayType = (schema: TCustomSchema): any => {
    // TODO: Check this logic
    if (isArray(schema.items)) {
      return map(schema.items, (item: Schema | ISchema) =>
        this.toType({
          ...item,
          _name: schema._name,
          _propKey: schema._propKey,
        }),
      );
    }

    const itemType = this.toType({
      ...(schema.items as TCustomSchema),
      _name: schema._name,
      _propKey: schema._propKey,
    });

    return schema.type === "array" ? `${itemType}[]` : itemType;
  };

  toEnumType = (schema: TCustomSchema) => {
    const enumType = generateEnumType(schema._name, schema._propKey);
    const hasNumber = some(schema.enum, (v) => isNumber(v));

    this.writeTo(enumType, schema.enum);

    if (hasNumber) {
      return enumType;
    }

    return `keyof typeof ${enumType}`;
  };

  toObjectType = (schema: TCustomSchema): TDictionary<any> | string => {
    const handleProperties = () =>
      reduce(
        schema.properties,
        (o, v, k) => ({
          ...o,
          [`${k}${indexOf(schema.required, k) > -1 ? "" : "?"}`]: this.toType({
            ...v,
            _propKey: k,
            _name: schema._name,
          }),
        }),
        {} as any,
      );
    return schema.properties ? handleProperties() : schema.type;
  };

  toOneOfType = (schemas: TCustomSchema) => {
    return map(schemas, (schema) => this.toType(schema)).join("|");
  };
}
