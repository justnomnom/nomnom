// tina/config.ts
import { defineConfig } from "tinacms";
var branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";
var config_default = defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: "admin",
    publicFolder: "public"
  },
  media: {
    tina: {
      mediaRoot: "",
      publicFolder: "public"
    }
  },
  schema: {
    collections: [
      {
        name: "seo_collection",
        label: "SEO Collections",
        path: "content/collections",
        format: "mdx",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "string", name: "description", label: "Description", ui: { component: "textarea" }, required: true },
          { type: "datetime", name: "date", label: "Date" },
          { type: "string", name: "tags", label: "Tags", list: true },
          { type: "string", name: "relatedRestaurantSlugs", label: "Related restaurant slugs", list: true },
          { type: "string", name: "relatedInfluencerSlugs", label: "Related influencer slugs", list: true },
          { type: "string", name: "relatedCollectionSlugs", label: "Related collection slugs", list: true },
          { type: "boolean", name: "draft", label: "Draft" },
          { type: "rich-text", name: "body", label: "Body", isBody: true }
        ],
        ui: {
          router: ({ document }) => `/collections/${document._sys.filename}`
        }
      },
      {
        name: "influencer",
        label: "Influencers",
        path: "content/influencers",
        format: "mdx",
        fields: [
          { type: "string", name: "title", label: "Display name", isTitle: true, required: true },
          { type: "string", name: "description", label: "Bio / summary", ui: { component: "textarea" }, required: true },
          { type: "string", name: "country", label: "Country slug (e.g. portugal)", required: true },
          { type: "string", name: "tags", label: "Tags", list: true },
          { type: "string", name: "relatedRestaurantSlugs", label: "Featured restaurant slugs", list: true },
          { type: "string", name: "relatedCollectionSlugs", label: "Related collection slugs", list: true },
          { type: "boolean", name: "draft", label: "Draft" },
          { type: "rich-text", name: "body", label: "Body", isBody: true }
        ],
        ui: {
          router: ({ document }) => {
            const d = document;
            const country = d.country || "portugal";
            return `/countries/${country}/influencers/${d._sys.filename}`;
          }
        }
      },
      {
        name: "resource",
        label: "Resources",
        path: "content/resources",
        format: "mdx",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "string", name: "description", label: "Description", ui: { component: "textarea" }, required: true },
          { type: "datetime", name: "date", label: "Date" },
          { type: "string", name: "tags", label: "Tags", list: true },
          { type: "boolean", name: "draft", label: "Draft" },
          { type: "rich-text", name: "body", label: "Body", isBody: true }
        ],
        ui: {
          router: ({ document }) => `/resources/${document._sys.filename}`
        }
      },
      {
        name: "feature",
        label: "Features",
        path: "content/features",
        format: "mdx",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "string", name: "description", label: "Description", ui: { component: "textarea" }, required: true },
          { type: "string", name: "tags", label: "Tags", list: true },
          { type: "boolean", name: "draft", label: "Draft" },
          { type: "rich-text", name: "body", label: "Body", isBody: true }
        ],
        ui: {
          router: ({ document }) => `/features/${document._sys.filename}`
        }
      }
    ]
  }
});
export {
  config_default as default
};
