import { DocumentFile, GraphQLSchema } from 'graphql-codegen-core';
export interface PluginConfig {
}
export declare function plugin(schema: GraphQLSchema, documents: DocumentFile[], config: PluginConfig): string;
