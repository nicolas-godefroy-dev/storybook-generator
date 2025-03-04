import * as vscode from "vscode";
import {
  withDefaultConfig,
  PropItem,
  PropItemType,
  ComponentDoc,
} from "react-docgen-typescript";
import { checkExistingStory } from "./checkExistingStory";

function defaultOrPlaceholder(
  defaultValue: null | { value: any },
  placeholder: string | number
) {
  return defaultValue && defaultValue.value ? defaultValue.value : placeholder;
}

function typeValue(
  type: PropItemType,
  defaultValue: null | { value: any }
): string | any[] {
  switch (type.name) {
    case "enum":
      if (Array.isArray(type.value)) {
        return type.value.map((v) => v.value);
      }
    case "boolean":
      return defaultOrPlaceholder(defaultValue, `true`);
    case "() => void":
      return defaultOrPlaceholder(defaultValue, `() => {}`);
    case "number":
      return defaultOrPlaceholder(defaultValue, 123);
    case "Date":
      return defaultOrPlaceholder(defaultValue, `new Date()`);
    case "string":
      return `"${defaultOrPlaceholder(defaultValue, "")}"`;
    default:
      return `undefined`;
  }
}

function propItemToStoryArg(key: string, idx: number, info: PropItem): string {
  const placeholder = typeValue(info.type, info.defaultValue);
  return `${key}: \${${idx + 3}${
    Array.isArray(placeholder)
      ? `|${placeholder.join(",")}|`
      : `:${placeholder}`
  }}`;
}

export async function createStoryFromTs(
  componentFsPath: string,
  storyUri: vscode.Uri,
  importName: string
) {
  let file = "";
  const parseResult = withDefaultConfig({
    shouldExtractLiteralValuesFromEnum: true,
    componentNameResolver: (_exp, source) => {
      file = source.text;
      return undefined;
    },
  }).parse(componentFsPath);

  const components = parseResult;

  let component: (ComponentDoc & { isDefault?: boolean }) | undefined;

  switch (components.length) {
    case 0:
      component = {
        isDefault: true,
        displayName: importName,
        filePath: componentFsPath,
        description: "",
        methods: [],
        props: {},
        tags: {},
      };
      break;
    case 1:
      component = components[0];
      component.isDefault = file.includes(
        `export default ${component.displayName}`
      );
      break;
    default:
      const items = components.map((c) => c.displayName);
      const selection = await vscode.window.showQuickPick(items, {
        canPickMany: false,
        placeHolder:
          "There are many components exported, which one do you want to use for the story?",
      });
      component = components.find((c) => c.displayName === selection)!;
      component.isDefault = file.includes(
        `export default ${component.displayName}`
      );
  }

  await checkExistingStory(storyUri, "typescriptreact");

  const args = Object.entries(component.props).reduce<string[]>(
    (args, [key, info], idx) => [...args, propItemToStoryArg(key, idx, info)],
    []
  );

  const cmpImport = !!component?.isDefault
    ? `import ${component.displayName} from "./${importName}"`
    : `import { ${component.displayName} } from "./${importName}"`;

  const tmpl = `import type { StoryObj, Meta } from "@storybook/react"

${cmpImport}

export default {
  component: ${component.displayName},
} satisfies Meta<typeof ${component.displayName}>

type Story = StoryObj<typeof ${component.displayName}>

export const \${${3 + args.length}:Default}: Story = {
  args: {
${args.map((a) => `    ${a}`).join(",\n")}
  },
}
`;
  const snippet = new vscode.SnippetString(tmpl);
  vscode.window.activeTextEditor?.insertSnippet(snippet);
}
