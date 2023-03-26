const govukEleventyPlugin = require('govuk-eleventy-plugin')

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


 module.exports = function(eleventyConfig) {
   // Register the plugin
   eleventyConfig.addPlugin(govukEleventyPlugin,{
    header: {
      organisationLogo: '',
      organisationName: 'Cross Government Software Community'
    }
   })

   return {
     dataTemplateEngine: 'njk',
     htmlTemplateEngine: 'njk',
     markdownTemplateEngine: 'njk',
     dir: {
       // Use layouts from the plugin
       layouts: 'node_modules/govuk-eleventy-plugin/layouts'
     }
   }
 };