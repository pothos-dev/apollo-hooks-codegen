import { DocumentFile, GraphQLSchema } from 'graphql-codegen-core';
export interface PluginConfig {
    idType?: string;
    scalarTypes?: {
        [scalarName: string]: string;
    };
}
export declare function plugin(schema: GraphQLSchema, documents: DocumentFile[], config: PluginConfig): string;
