import { isEmpty, keys, map, uniqueId } from "lodash";
import { getRefId, isArray, quoteKey, toCapitalCase } from "src/utils";
import { createRegister, DeclKinds } from "src/createRegister";

export type CustomType = Ref | Obj | Arr | Enum | OneOf | BasicType;

abstract class TypeFactory {
  abstract toType(): string;
}

class BasicType extends TypeFactory {
  static type(name: string) {
    return new BasicType(name);
  }

  constructor(private name: string) {
    super();
  }

  toType() {
    return this.name;
  }
}

export class Enum extends TypeFactory {
  constructor(private id: string, private value?: any[]) {
    super();
  }

  toType(): string {
    if (this.value) {
      return `{
      ${this.value
        .map((v) => {
          return `'${v}' = '${v}',`;
        })
        .join("\n")}
      }`;
    }
    return `keyof typeof ${this.id}`;
  }
}

class OneOf extends TypeFactory {
  constructor(private types: CustomType[]) {
    super();
  }

  toType(): string {
    return `${map(this.types, (type) => type.toType()).join("|")}`;
  }
}

export class Arr extends TypeFactory {
  // TODO: remove any later
  constructor(private data: CustomType[] | CustomType) {
    super();
  }

  toType(): string {
    if (isArray(this.data)) {
      return `[${map(this.data as CustomType[], (v) => v.toType())}]`;
    }
    return `${(this.data as CustomType).toType()}[]`;
  }
}

export class Ref extends TypeFactory {
  alias: string | undefined;

  constructor(private name: string) {
    super();
  }

  rename(alias: string) {
    this.alias = alias;
  }

  toType(): string {
    return this.alias || this.name;
  }
}

export class Obj extends TypeFactory {
  constructor(
    private props: { [key: string]: CustomType } | string,
    private refs?: Ref[],
    private useExtends?: boolean,
  ) {
    super();
  }

  toType(useExtends = this.useExtends): string {
    if (this.props === "object") {
      return "{[key:string]:any}";
    }

    const handler = (props: { [key: string]: CustomType } | CustomType): string => {
      // //TODO: refactor next line later
      if (props?.toType) {
        return (props as CustomType).toType();
      }
      const data = keys(props)
        .sort()
        .map((k) => {
          // TODO: remove any later
          return `${quoteKey(k)}: ${(props as any)[k].toType()};`;
        });
      return `{${data.join("")}}`;
    };
    if (!isEmpty(this.refs)) {
      if (isEmpty(this.props)) {
        // TODO: handle this case and add test for it
        if (!useExtends) {
          return map(this.refs, (v) => v.toType()).join("&");
        }
        return `extends ${map(this.refs, (v) => v.toType()).join(",")} {}`;
      }
      return useExtends
        ? `extends ${map(this.refs, (v) => v.toType()).join(",")} ${handler(
            this.props as { [key: string]: CustomType },
          )}`
        : `${map(this.refs, (v) => v.toType()).join("&")}&${handler(this.props as { [key: string]: CustomType })}`;
    }
    return handler(this.props as { [key: string]: CustomType });
  }
}

export class Type {
  //TODO: 解决 id 重名的问题
  constructor(private register: ReturnType<typeof createRegister>) {}

  enum(value: any[], id: string = uniqueId("Enum")) {
    this.register.setDecl(id, new Enum(id, value), DeclKinds.enum);
    return new Enum(id);
  }

  ref($ref: string) {
    const id = toCapitalCase(getRefId($ref));
    return this.register.setRef(id);
  }

  array(types: CustomType | CustomType[]) {
    return new Arr(types);
  }

  oneOf(types: CustomType[]) {
    return new OneOf(types);
  }

  object(props: { [key: string]: CustomType } | string, refs?: Ref[], useExtends?: boolean) {
    return new Obj(props, refs, useExtends);
  }

  boolean() {
    return BasicType.type("boolean");
  }

  string() {
    return BasicType.type("string");
  }

  null() {
    return BasicType.type("null");
  }

  number() {
    return BasicType.type("number");
  }

  file() {
    return BasicType.type("File");
  }
}