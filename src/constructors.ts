export interface Constructor {
  code: number,
  args:  (...any) => [...any],
  build: (...any) => any
};

export const constructors = {
  RegExp: <Constructor> {
    code: 0,
    args: (item: RegExp) => [item.source, item.flags],
    build(pattern: string | RegExp, flags?: string): RegExp {
      return new RegExp(pattern, flags);
    },
  },
  Date: <Constructor> {
    code: 1,
    args: (item: Date) => [item.valueOf()],
    build(value: string | number | Date): Date {
      return new Date(value);
    },
  },
};
