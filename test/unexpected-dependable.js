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
      prefix: function (output, value) {
        return output.code("observable('").jsString(value.id).code("', ");
      },
      suffix: function (output) {
        return output.code(")");
      },
    });

    expect.addType({
      name: "dependable-computed",
      base: "dependable-observable",
      identify: function (value) {
        return value && value.isComputed;
      },
      prefix: function (output, value) {
        return output.code("computed('").jsString(value.id).code("', ");
      },
    });
  },
};
