"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var graphql_1 = require("graphql");
function plugin(schema, documents, config) {
    var inputNames = {};
    return join.apply(void 0, [disclaimer,
        imports,
        ''].concat(documents.map(function (documentFile) {
        return formatDocumentFile(documentFile, schema, inputNames);
    }), ['',
        formatInputNames(schema, inputNames),
        boilerplate]));
}
exports.plugin = plugin;
function formatInputNames(schema, inputNames) {
    findRecursiveInputReferences(schema, inputNames, Object.keys(inputNames));
    if (Object.keys(inputNames).length == 0)
        return '';
    return join.apply(void 0, ['/*',
        ' * GraphQL InputTypes',
        ' */',
        ''].concat(Object.keys(inputNames).map(function (name) {
        var node = schema.getType(name);
        return formatGraphQLInputObjectType(node);
    })));
}
function findRecursiveInputReferences(schema, inputNames, newNames) {
    if (newNames.length == 0)
        return;
    var newNames2 = [];
    for (var _i = 0, newNames_1 = newNames; _i < newNames_1.length; _i++) {
        var name = newNames_1[_i];
        var node = schema.getType(name);
        var fieldMap = node.getFields();
        var fields = Object.values(fieldMap);
        for (var _a = 0, fields_1 = fields; _a < fields_1.length; _a++) {
            var field = fields_1[_a];
            handleInputType(field.type);
        }
    }
    findRecursiveInputReferences(schema, inputNames, newNames2);
    function handleInputType(node) {
        if (graphql_1.isNonNullType(node)) {
            handleInputType(node.ofType);
            return;
        }
        if (graphql_1.isListType(node)) {
            handleInputType(node.ofType);
            return;
        }
        if (graphql_1.isInputObjectType(node)) {
            if (!inputNames[node.name]) {
                inputNames[node.name] = true;
                newNames2.push(node.name);
            }
            return;
        }
    }
}
function formatGraphQLInputObjectType(node) {
    var fieldMap = node.getFields();
    var fields = Object.values(fieldMap);
    return join.apply(void 0, ['interface ' + node.name + '{'].concat(fields.map(function (field) { return formatInputField(field); }), ['}\n']));
}
function formatInputField(field) {
    var isRequired = graphql_1.isNonNullType(field.type);
    var questionMark = isRequired ? '' : '?';
    return field.name + questionMark + ': ' + formatInputType(field.type);
}
function formatInputType(node) {
    if (graphql_1.isNonNullType(node)) {
        return node.ofType;
    }
    if (graphql_1.isListType(node)) {
        return 'ReadonlyArray<' + node.ofType + '>';
    }
    if (graphql_1.isEnumType(node)) {
        // ! TODO
        throw 'Unhandled GraphQLEnumType in formatInputType';
    }
    if (graphql_1.isScalarType(node)) {
        return formatGraphQLScalarType(node);
    }
    if (graphql_1.isInputObjectType(node)) {
        return node.name;
    }
    throw 'Unhandled GraphQLInputType';
}
function formatDocumentFile(file, schema, inputNames) {
    return join('', '', '/*', ' * Operations from ' + file.filePath, ' */', '', formatDocumentNode(file.content, schema, inputNames));
}
function formatDocumentNode(node, schema, inputNames) {
    return node.definitions
        .map(function (definitionNode) { return formatDefinition(definitionNode, schema, inputNames); })
        .join('\n');
}
function formatDefinition(node, schema, inputNames) {
    switch (node.kind) {
        case 'OperationDefinition':
            return formatOperationDefinition(node, schema, inputNames);
        default:
            throw 'unhandled DefinitionNode.kind = ' + node.kind;
    }
}
function formatOperationDefinition(node, schema, inputNames) {
    return ('export const ' +
        node.name.value +
        ' = ' +
        definerFunction(node.operation) +
        '<' +
        formatVariableDefinitions(node.variableDefinitions, inputNames) +
        ',' +
        formatSelectionSet(node.selectionSet, selectSchemaObject(schema, node.operation)) +
        '>(gql`\n' +
        indent(formatLoc(node.loc), '  ') +
        '\n`)\n');
    function definerFunction(operation) {
        switch (operation) {
            case 'query':
                return 'defineQuery';
            case 'mutation':
                return 'defineMutation';
            case 'subscription':
                throw 'TODO';
        }
    }
}
function formatLoc(loc) {
    return loc.source.body.substring(loc.start, loc.end);
}
function formatVariableDefinitions(nodes, inputNames) {
    var list = nodes.map(function (variableNode) {
        return formatVariableDefinition(variableNode, inputNames);
    });
    return join.apply(void 0, ['{', '  /* variables */'].concat(list, ['}']));
}
function formatVariableDefinition(node, inputNames) {
    // todo defaultValue
    var isRequired = node.type.kind == 'NonNullType';
    var questionMark = isRequired ? '' : '?';
    return (node.variable.name.value +
        questionMark +
        ': ' +
        formatTypeNode(node.type, inputNames));
}
function formatTypeNode(node, inputNames) {
    if (node.kind == 'NonNullType') {
        return formatTypeNodeNotNull(node.type, inputNames);
    }
    return 'null | ' + formatTypeNodeNotNull(node, inputNames);
}
function formatTypeNodeNotNull(node, inputNames) {
    switch (node.kind) {
        case 'ListType':
            return 'Array<' + formatTypeNode(node.type, inputNames) + '>';
        case 'NamedType':
            return formatNameTypeNode(node, inputNames);
    }
}
function formatNameTypeNode(node, inputNames) {
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
            inputNames[node.name.value] = true;
            return node.name.value;
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
        return formatGraphQLOutputTypeNotNull(type.ofType, selectionSet, offset);
    }
    return 'null | ' + formatGraphQLOutputTypeNotNull(type, selectionSet, offset);
}
function formatGraphQLOutputTypeNotNull(type, selectionSet, offset) {
    if (graphql_1.isScalarType(type)) {
        return formatGraphQLScalarType(type);
    }
    if (graphql_1.isObjectType(type)) {
        return formatGraphQLObjectType(type, selectionSet, offset);
    }
    if (graphql_1.isListType(type)) {
        return ('Array<' +
            formatGraphQLOutputType(type.ofType, selectionSet, offset) +
            '>');
    }
    if (graphql_1.isEnumType(type)) {
        var enumValues = type.getValues();
        return enumValues.map(function (value) { return "'" + value.name + "'"; }).join(' | ');
    }
    throw 'unhandled GraphQLOutputType "' + type + '"';
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
var imports = "\nimport * as React from 'react'\nimport { createContext, useEffect, useState, useContext } from 'react'\nimport ApolloClient, {\n  MutationOptions,\n  ObservableQuery,\n  WatchQueryOptions,\n} from 'apollo-client'\nimport { FetchResult } from 'apollo-link'\nimport { DocumentNode } from 'graphql'\nimport gql from 'graphql-tag'\n";
var boilerplate = "\n/*\n * Boilerplate\n */\n\ntype Omit<T, K> = Pick<T, Exclude<keyof T, K>>\ntype Error = any\ntype QueryOpts<V> = Omit<WatchQueryOptions<V>, 'query'>\ntype MutateOpts<D, V> = Omit<MutationOptions<D, V>, 'mutation'>\n\n// We grab the ApolloClient from this context within our hooks\ntype ContextType = { apolloClient?: ApolloClient<any> }\nconst apolloContext = createContext<ContextType>({})\n\n// Must be inserted at the root of all components that want to use the hook\n// functions supplied by this file.\nexport function ApolloHooksProvider({\n  children,\n  apolloClient,\n}: {\n  children: React.ReactNode\n  apolloClient?: ApolloClient<any> | undefined\n}) {\n  const elementType = apolloContext.Provider\n  const elementProps: React.ProviderProps<ContextType> = {\n    value: { apolloClient },\n  }\n  return React.createElement(elementType, elementProps, children)\n}\n\n// Converts a gql-snippet into a user-callable function that takes options,\n// which can then be passed to useApolloQuery to execute the query.\nfunction defineQuery<V, D>(doc: DocumentNode) {\n  return function configureQuery(opts: QueryOpts<V> = {}) {\n    return function executeQuery(client: ApolloClient<any>) {\n      return client.watchQuery<D>({ query: doc, ...opts })\n    }\n  }\n}\n\n// Executes a query that has been created by calling the exported function with\n// the same name as the query operation.\n// The React Hooks rules apply - this function must be called unconditionally\n// within a functional React Component and will rerender the component whenever\n// the query result changes.\nexport function useApolloQuery<D, V>(\n  configuredQuery: (client: ApolloClient<any>) => ObservableQuery<D, V>\n): [D | undefined, Error | undefined] {\n  const { apolloClient } = useContext(apolloContext)\n  if (!apolloClient) throw 'No ApolloClient provided'\n\n  const watchQuery = configuredQuery(apolloClient)\n\n  const [data, setData] = useState<D | undefined>(undefined)\n  const [error, setError] = useState<Error | undefined>(undefined)\n  useEffect(() => {\n    const subscription = watchQuery.subscribe(\n      result => setData(result.data),\n      error => setError(error)\n    )\n    return () => subscription.unsubscribe()\n  }, [])\n\n  return [data, error]\n}\n\n// Converts a gql-snippet into a user-callable function that takes options,\n// which can then be passed to useApolloMutation to provide the mutate function.\nfunction defineMutation<V, D>(mutation: DocumentNode) {\n  return function configureMutation(opts: MutateOpts<D, V> = {}) {\n    return function loadMutation(client: ApolloClient<any>) {\n      return function executeMutation(opts2: MutateOpts<D, V> = {}) {\n        return client.mutate<D>({ mutation, ...opts, ...opts2 })\n      }\n    }\n  }\n}\n\n// Prepares a mutate function when supplied with the exported function with\n// the same name as the mutation operation.\n// The React Hooks rules apply - this function must be called unconditionally\n// within a functional React Component.\nexport function useApolloMutation<D, V>(\n  configuredMutation: (\n    client: ApolloClient<any>\n  ) => (opts?: MutateOpts<D, V>) => Promise<FetchResult<D>>\n) {\n  const { apolloClient } = useContext(apolloContext)\n  if (!apolloClient) throw 'No ApolloClient provided'\n  const mutate = configuredMutation(apolloClient)\n  return mutate\n}\n";
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
