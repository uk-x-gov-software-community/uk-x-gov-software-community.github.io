const govukEleventyPlugin = require('@x-govuk/govuk-eleventy-plugin')

module.exports = function(eleventyConfig) {
  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });
  return {
   addPassthroughCopy: function (dir) {
     eleventyConfig.addPassthroughCopy(dir)
   },
  };
}


 module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy('assets')
  eleventyConfig.addPassthroughCopy('open-source-presentation/*.png')
 
   // Register the plugin
   eleventyConfig.addPlugin(govukEleventyPlugin,{
    fontFamily: 'arial, sans-serif',
    header: {
      logotype: {
        html: '<img id="xgov-logo" src="assets/logo/cgov-logo.svg" alt="Cross Government Software Engineering Community">',
      },
       productName: 'Cross Government Software Engineering Community',
    },
    footer: {
      contentLicence: {
        html: 'A community project. <a class="govuk-footer__link" href="https://github.com/uk-x-gov-software-community/uk-x-gov-software-community.github.io">GitHub source</a>.<br /> Thanks to <a href="https://x-govuk.github.io/govuk-eleventy-plugin/" class="govuk-link" >X-GOVUK projects</a> for the template' 
      },
      copyright: {
        text: '© Cross Government Software Engineering Community'
      }
    }
   })
   
   return {
     dataTemplateEngine: 'njk',
     htmlTemplateEngine: 'njk',
     markdownTemplateEngine: 'njk',
     dir: {
       // Use layouts from the plugin
       layouts: 'node_modules/@x-govuk/govuk-eleventy-plugin/layouts'
     }
   }
 };
