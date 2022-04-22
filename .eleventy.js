module.exports = function(eleventyConfig) {
  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });
  eleventyConfig.addPassthroughCopy('assets')
  return {
    passthroughFileCopy: true
  }
}