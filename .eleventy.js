module.exports = function(eleventyConfig) {
  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });
  eleventyConfig.addPassthroughCopy('assets')
  eleventyConfig.addPassthroughCopy('open-source-presentation/*.png')
  return {
    passthroughFileCopy: true
  }
}