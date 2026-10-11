import { govukEleventyPlugin } from "@x-govuk/govuk-eleventy-plugin";

export default function (eleventyConfig) {
  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy(
    "special-interest/open-source/open-source-presentation/*.png",
  );

  // Register the plugin
  eleventyConfig.addPlugin(govukEleventyPlugin, {
    titleSuffix: false,
    rebrand: false,
    header: {
      logotype: {
        html: '<img id="xgov-logo" src="/../../../assets/logo/cgov-logo-2.svg" alt="Cross Government Software Engineering Community">',
      },
      productName: "Cross Government Software Engineering Community",
    },
    headingPermalinks: true,

    footer: {
      contentLicence: {
        html: 'A community project. <a class="govuk-footer__link" href="https://github.com/uk-x-gov-software-community/uk-x-gov-software-community.github.io">GitHub source</a>.<br /> Thanks to <a href="https://x-govuk.github.io/govuk-eleventy-plugin/" class="govuk-link" >X-GOVUK projects</a> for the template',
      },
      copyright: {
        html: "Responsibility &#9745; Pragmatism  &#9745; Public Service  &#9745; <br /> © Cross Government Software Engineering Community",
      },
    },
    stylesheets: ["/assets/application.css"],
  });

  return {
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
