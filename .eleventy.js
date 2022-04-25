let Nunjucks = require("nunjucks");
module.exports = function(eleventyConfig) {
  let nunjucksEnvironment = new Nunjucks.Environment(
    new Nunjucks.FileSystemLoader(["node_modules/govuk-frontend/","_includes"])
  );

  eleventyConfig.setLibrary("njk", nunjucksEnvironment);

  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });
  eleventyConfig.addPassthroughCopy('assets')
  return {
    passthroughFileCopy: true
  }
}
