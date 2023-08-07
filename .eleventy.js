const govukEleventyPlugin = require('@x-govuk/govuk-eleventy-plugin')

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
      organisationName: 'Cross Government Software Community',
      navigation: [
        {
          href: "#",
          text: "Navigation item 1",
          active: true
        },
        {
          href: "#",
          text: "Navigation item 2"
        },
        {
          href: "#",
          text: "Navigation item 3"
        },
        {
          href: "#",
          text: "Navigation item 4"
        }
      ]
    },
    footer: {
      contentLicence: {
        html: 'A community project. <a class="govuk-footer__link" href="https://github.com/uk-x-gov-software-community/uk-x-gov-software-community.github.io">GitHub source</a>.' 
      },
      copyright: {
        text: '© Cross Government Software Community'
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
