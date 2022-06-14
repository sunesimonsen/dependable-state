export default {
  name: "unexpected-dependable",
  installInto: function (expect) {
    expect.addType({
      name: "dependable-observable",
      base: "wrapperObject",
      identify: function (value) {
        return value && value.isObservable;
      },
      unwrap: function (observable) {
        return observable();
      },
      prefix: function (output) {
        return output.code("observable(");
      },
      suffix: function (output, value) {
        if (value.id) {
          output.code(", { id: '").jsString(value.id).code("' }");
        }
        output.code(")");
        return output;
      },
    });

    expect.addType({
      name: "dependable-computed",
      base: "dependable-observable",
      identify: function (value) {
        return value && value.isComputed;
      },
      prefix: function (output, value) {
        return output.code("computed(");
      },
    });
  },
};
