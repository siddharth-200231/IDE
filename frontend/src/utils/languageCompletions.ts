export const pythonCompletions = {
  keywords: ['def', 'class', 'if', 'else', 'elif', 'while', 'for', 'try', 'except'],
  builtins: ['print', 'len', 'str', 'int', 'float', 'list', 'dict', 'set', 'range'],
  snippets: [
    {
      label: 'def',
      insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}',
      insertTextRules: 4,
      kind: 14
    },
    {
      label: 'class',
      insertText: 'class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}',
      insertTextRules: 4,
      kind: 14
    }
  ]
};

export const javaCompletions = {
  keywords: ['public', 'private', 'class', 'static', 'void', 'int', 'String'],
  builtins: ['System.out.println', 'String[]', 'main'],
  snippets: [
    {
      label: 'class',
      insertText: 'public class ${1:ClassName} {\n\t${2}\n}',
      insertTextRules: 4,
      kind: 14
    },
    {
      label: 'main',
      insertText: 'public static void main(String[] args) {\n\t${1}\n}',
      insertTextRules: 4,
      kind: 14
    }
  ]
};