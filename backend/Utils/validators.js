const isNumber = (value) => typeof value === "number" && !Number.isNaN(value);

module.exports = { isNumber };
