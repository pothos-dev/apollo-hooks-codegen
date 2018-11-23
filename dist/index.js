"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var graphql_1 = require("graphql");
function plugin(schema, documents, config) {
    schema.getQueryType();
    return join.apply(void 0, [disclaimer,
        imports,
        ''].concat(documents.map(function (documentFile) { return formatDocumentFile(documentFile, schema); }), ['',
        boilerplate]));
}
exports.plugin = plugin;
function formatDocumentFile(file, schema) {
    return join('', '', '/*', ' * Operations from ' + file.filePath, ' */', '', formatDocumentNode(file.content, schema));
}
function formatDocumentNode(node, schema) {
    return node.definitions
        .map(function (definitionNode) { return formatDefinition(definitionNode, schema); })
        .join('\n');
}
function formatDefinition(node, schema) {
    switch (node.kind) {
        case 'OperationDefinition':
            return formatOperationDefinition(node, schema);
        default:
            throw 'unhandled DefinitionNode.kind = ' + node.kind;
    }
}
function formatOperationDefinition(node, schema) {
    return ('export const ' +
        node.name.value +
        ' = ' +
        node.operation +
        'Factory' +
        '<' +
        formatVariableDefinitions(node.variableDefinitions) +
        ',' +
        formatSelectionSet(node.selectionSet, selectSchemaObject(schema, node.operation)) +
        '>(gql`\n' +
        indent(formatLoc(node.loc), '  ') +
        '\n`)');
}
function formatLoc(loc) {
    return loc.source.body.substring(loc.start, loc.end);
}
function formatVariableDefinitions(nodes) {
    var list = nodes.map(formatVariableDefinition);
    return join.apply(void 0, ['{', '  /* variables */'].concat(list, ['}']));
}
function formatVariableDefinition(node) {
    // todo defaultValue
    var isRequired = node.type.kind == 'NonNullType';
    var questionMark = isRequired ? '' : '?';
    return (node.variable.name.value + questionMark + ': ' + formatTypeNode(node.type));
}
function formatTypeNode(node) {
    switch (node.kind) {
        case 'NonNullType':
            return formatTypeNodeNotNull(node.type);
        case 'ListType':
            return formatTypeNode(node.type) + '[]';
        case 'NamedType':
            return formatTypeNodeNotNull(node) + '| null';
    }
}
function formatTypeNodeNotNull(node) {
    switch (node.kind) {
        case 'ListType':
            return formatTypeNode(node.type) + '[]';
        case 'NamedType':
            return formatNameTypeNode(node);
    }
}
function formatNameTypeNode(node) {
    switch (node.name.value) {
        case 'String':
            return 'string';
        case 'Int':
            return 'number';
        case 'Float':
            return 'number';
        case 'Boolean':
            return 'boolean';
        case 'ID':
            return 'string';
        default:
            throw 'unhandled NamedTypeNode ' + node.name.value;
    }
}
function formatSelectionSet(node, schemaObject) {
    var list = node.selections.map(function (selectionNode) {
        return formatSelectionNode(selectionNode, schemaObject, '  ');
    });
    return join.apply(void 0, ['{', '  /* data */'].concat(list, ['}']));
}
function formatSelectionNode(node, schemaObject, offset) {
    switch (node.kind) {
        case 'Field':
            return formatFieldNode(node, schemaObject, offset);
        default:
            throw 'unhandled SelectionNode.kind = ' + node.kind;
    }
}
function formatFieldNode(node, schemaObject, offset) {
    var schemaName = node.name.value;
    var aliasName = node.alias ? node.alias.value : schemaName;
    var schemaField = schemaObject.getFields()[schemaName];
    var isRequired = graphql_1.isNonNullType(schemaField.type);
    var questionMark = isRequired ? '' : '?';
    return (offset +
        aliasName +
        questionMark +
        ': ' +
        formatGraphQLOutputType(schemaField.type, node.selectionSet, offset + '  '));
}
function formatGraphQLOutputType(type, selectionSet, offset) {
    if (graphql_1.isNonNullType(type)) {
        return formatGraphQLOutputType(type.ofType, selectionSet, offset);
    }
    if (graphql_1.isScalarType(type)) {
        return formatGraphQLScalarType(type);
    }
    if (graphql_1.isObjectType(type)) {
        return formatGraphQLObjectType(type, selectionSet, offset);
    }
    throw 'unhandled GraphQLOutputType ' + type;
}
function formatGraphQLScalarType(type) {
    switch (type.name) {
        case 'String':
            return 'string';
        case 'Int':
            return 'number';
        case 'Float':
            return 'number';
        case 'Boolean':
            return 'boolean';
        case 'ID':
            return 'string';
        default:
            throw 'unhandled GraphQLScalarType ' + type;
    }
}
function formatGraphQLObjectType(type, selectionSet, offset) {
    var list = selectionSet.selections.map(function (selectionNode) {
        return formatSelectionNode(selectionNode, type, offset);
    });
    return join.apply(void 0, ['{'].concat(list, ['}']));
}
function selectSchemaObject(schema, operation) {
    switch (operation) {
        case 'query':
            return schema.getQueryType();
        case 'mutation':
            return schema.getMutationType();
        case 'subscription':
            return schema.getSubscriptionType();
    }
}
var disclaimer = "\n/*\n * This file was generated by graphql-code-generator with the apollo-hooks-codegen plugin.\n * Any changes made to the file will be overwritten.\n */\n";
var imports = "\nimport ApolloClient, {\n  MutationOptions,\n  ObservableQuery,\n  WatchQueryOptions,\n} from 'apollo-client'\nimport { createContext, useEffect, useState, useContext } from 'react'\nimport { DocumentNode } from 'graphql'\nimport gql from 'graphql-tag'\n";
var boilerplate = "\n/*\n * Boilerplate\n */\n\ntype Omit<T, K> = Pick<T, Exclude<keyof T, K>>\n\nconst apolloContext = createContext<{ apolloClient?: ApolloClient<any> }>({})\n\nexport function useApolloWatchQuery<Data, Variables>(\n  queryFactory: (\n    apolloClient: ApolloClient<any>\n  ) => ObservableQuery<Data, Variables>\n): Data | undefined {\n  const { apolloClient } = useContext(apolloContext)\n  const [state, setState] = useState<Data | undefined>(undefined)\n  useEffect(() => {\n    const watchQuery = queryFactory(apolloClient)\n    const subscription = watchQuery.subscribe(result => setState(result.data))\n    return () => subscription.unsubscribe()\n  }, [])\n  return state\n}\n\n// export function useApolloMutation<Data, Variables>(\n//   mutationFactory: (\n//     apolloClient: ApolloClient<any>\n//     ) => ObservableQuery<Data, Variables>\n// )\n\nfunction queryFactory<Variables, Data>(doc: DocumentNode) {\n  return function(options: Omit<WatchQueryOptions<Variables>, 'query'> = {}) {\n    return function(apolloClient: ApolloClient<any>) {\n      return apolloClient.watchQuery<Data>({ query: doc, ...options })\n    }\n  }\n}\n\n// function mutationFactory<Variables, Data>(mutation: DocumentNode) {\n//   return function(\n//     options: Omit<MutationOptions<Data, Variables>, 'mutation'> = {}\n//   ) {\n//     return async function(apolloClient: ApolloClient<any>) {\n//       const result = await apolloClient.mutate<Data>({ mutation, ...options })\n//       return result.data as Data\n//     }\n//   }\n// }\n\n";
function join() {
    var lines = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        lines[_i] = arguments[_i];
    }
    return lines.join('\n');
}
function indent(multilineText, offset) {
    return multilineText
        .trim()
        .split('\n')
        .map(function (line) { return offset + line; })
        .join('\n');
}
