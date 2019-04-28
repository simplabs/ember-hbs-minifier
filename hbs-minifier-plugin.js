'use strict';

/* eslint-env node */
const Util = require('./utils/helpers');
const stripWhiteSpace = Util.stripWhiteSpace;
const isWhitespaceTextNode = Util.isWhitespaceTextNode;
const hasLeadingOrTrailingWhiteSpace = Util.hasLeadingOrTrailingWhiteSpace;
const stripNoMinifyBlocks = Util.stripNoMinifyBlocks;
const canTrimBlockStatementContent = Util.canTrimBlockStatementContent;
const canTrimElementNodeContent = Util.canTrimElementNodeContent;

class BasePlugin {
  static createASTPlugin(config) {
    let preStack = [];
    return {
      name: 'hbs-minifier-plugin',

      visitor: {
        TextNode(node) {
          let chars = node.chars;
          if (preStack.length === 0 && hasLeadingOrTrailingWhiteSpace(chars)) {
            node.chars = stripWhiteSpace(chars);
          }
        },

        BlockStatement: {
          enter(node) {
            let canTrim = canTrimBlockStatementContent(node, config);
            if (!canTrim) {
              preStack.push(node);
            }
          },

          exit(node) {
            if (preStack[preStack.length - 1] === node) {
              preStack.pop();
            }
          },
        },

        Program: {
          enter(node) {
            if (preStack.length !== 0) {
              return;
            }

            let firstChild = node.body[0];
            if (isWhitespaceTextNode(firstChild)) {
              node.body.shift();
            }

            let lastChild = node.body[node.body.length - 1];
            if (isWhitespaceTextNode(lastChild)) {
              node.body.pop();
            }
          },

          exit(node) {
            node.body = stripNoMinifyBlocks(node.body);
          },
        },

        ElementNode: {
          enter(node) {
            let canTrim = canTrimElementNodeContent(node, config);

            if (!canTrim) {
              preStack.push(node);
            }

            if (preStack.length !== 0) {
              return;
            }

            let firstChild = node.children[0];
            if (isWhitespaceTextNode(firstChild)) {
              node.children.shift();
            }

            let lastChild = node.children[node.children.length - 1];
            if (isWhitespaceTextNode(lastChild)) {
              node.children.pop();
            }
          },

          exit(node) {
            node.children = stripNoMinifyBlocks(node.children);

            if (preStack[preStack.length - 1] === node) {
              preStack.pop();
            }
          }
        },
      } };
  }
}

module.exports = function(config) {
  return class HBSMinifierPlugin extends BasePlugin {

    transform(ast) {
      let startLoc = ast.loc ? ast.loc.start : {};
      /*
        Checking for line and column to avoid registering the plugin for ProgramNode inside a BlockStatement since transform is called for all ProgramNodes in Ember 2.15.X. Removing this would result in minifying all the TextNodes.
      */
      if (startLoc.line !== 1 || startLoc.column !== 0) {
        return ast;
      }

      let plugin = HBSMinifierPlugin.createASTPlugin(config);
      this.syntax.traverse(ast, plugin.visitor);
      return ast;
    }
  };
};
