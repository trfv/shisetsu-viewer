import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      [`${process.env["GRAPHQL_ENDPOINT"]}`]: {
        headers: {
          "x-hasura-admin-secret": `${process.env["ADMIN_SECRET"]}`,
          "x-hasura-role": "user",
        },
      },
    },
  ],
  documents: ["./api/queries/*.graphql"],
  generates: {
    "./api/gql/": {
      preset: "client",
    },
  },
};

export default config;
