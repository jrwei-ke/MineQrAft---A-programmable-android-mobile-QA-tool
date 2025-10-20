/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/*
This toolbox contains nearly every single built-in block that Blockly offers,
in addition to the custom block 'add_text' this sample app adds.
You probably don't need every single block, and should consider either rewriting
your toolbox from scratch, or carefully choosing whether you need each block
listed here.
*/

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Start',
      colour: '310',
      contents: [
        {
        kind: 'block',
        type: 'main_script',
        },
      ]
    },
    {
      kind: 'category',
      name: 'Check',
      colour: '170',
      contents: [
        {
          kind: 'block',
          type: 'check_template',
        },
        {
          kind: 'block',
          type: 'check_text',
        },
      ]
    },
    {
      kind: 'category',
      name: 'Find',
      colour: '230',
      contents: [
        {
          kind: 'block',
          type: 'find_template',
        },
        {
          kind: 'block',
          type: 'find_text',
        },
      ]
    },
    {
      kind: 'category',
      name: 'Motion',
      colour: '100',
      contents: [
        {
          kind: 'block',
          type: 'click',
        },
        {
          kind: 'block',
          type: 'click_object',
        },
        {
          kind: 'block',
          type: 'slide',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Function',
      colour: '50',
      contents: [
        {
        kind: 'block',
        type: 'text_input',
        },
        {
          kind: 'block',
          type: 'wait_time',
        },
        {
          kind: 'block',
          type: 'go_url',
        },
      ]
    },
  ],
};
