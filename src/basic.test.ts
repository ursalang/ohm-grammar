// Ursa parser tests of basics using inline source snippets.
// © Reuben Thomas 2023
// Released under the MIT license.

import {testGroup} from './testutil.js'

Error.stackTraceLimit = Infinity

testGroup('Comments', [
  ['// Comment', []],
  ['// Comment\n3', ['3']],
])

testGroup('Concrete values', [
  ['4', ['4']],
  [String.raw`"hello \u00e9"`, ['"hello \\u00e9"']],
])

testGroup('Intrinsics', [
  ['3 + 4', [{0: '3', 2: '4', type: 'SumExp_plus'}]],
  ['(3 + 4) * 5', [
    {
      0: {0: '3', 2: '4', type: 'SumExp_plus'},
      2: '5',
      type: 'ProductExp_times',
    },
  ]],
  ['3 + 4 == 7', [
    {
      0: {0: '3', 2: '4', type: 'SumExp_plus'},
      2: '7',
      type: 'CompareExp_eq',
    },
  ]],
  ['not 2', [{1: '2', type: 'UnaryExp_not'}]],
  ['~2', [{1: '2', type: 'UnaryExp_bitwise_not'}]],
  ['34 & 48', [{0: '34', 2: '48', type: 'BitwiseExp_and'}]],
  ['34 | 48', [{0: '34', 2: '48', type: 'BitwiseExp_or'}]],
  ['34 ^ 48', [{0: '34', 2: '48', type: 'BitwiseExp_xor'}]],
  ['34 << 4', [{0: '34', 2: '4', type: 'BitwiseExp_lshift'}]],
  ['-34 >> 4', [
    {
      0: {1: '34', type: 'UnaryExp_neg'},
      2: '4',
      type: 'BitwiseExp_arshift',
    },
  ]],
  ['34 >>> 4', [{0: '34', 2: '4', type: 'BitwiseExp_lrshift'}]],
])

testGroup('Identifiers', [
  ['pi', ['pi']],
])

testGroup('Sequences', [
  ['{ pi }', [['pi']]],
  ['{ pi; 3+4 }', [['pi', {0: '3', 2: '4', type: 'SumExp_plus'}]]],
  ['{ pi; 3+4; }', [['pi', {0: '3', 2: '4', type: 'SumExp_plus'}]]],
])

testGroup('Conditionals', [
  ['if true {3} else {4}', [
    {
      0: [{1: 'true', 2: ['3'], type: 'If'}],
      1: 'else',
      2: ['4'],
      type: 'Ifs',
    },
  ]],
  ['if 3 + 4 == 7 {1} else {0}', [
    {
      0: [
        {
          1: {
            0: {0: '3', 2: '4', type: 'SumExp_plus'},
            2: '7',
            type: 'CompareExp_eq',
          },
          2: ['1'],
          type: 'If',
        },
      ],
      1: 'else',
      2: ['0'],
      type: 'Ifs',
    },
  ]],
  ['1 or 2', [{
    0: '1', 1: 'or', 2: '2', type: 'LogicExp_or',
  }]],
  ['1 and 2', [{
    0: '1', 1: 'and', 2: '2', type: 'LogicExp_and',
  }]],
  ['if 3 + 4 == 8 {1} else if 3 + 4 == 7 {2} else {3}', [
    {
      0: [
        {
          1: {
            0: {0: '3', 2: '4', type: 'SumExp_plus'},
            2: '8',
            type: 'CompareExp_eq',
          },
          2: ['1'],
          type: 'If',
        },
        {
          1: {
            0: {0: '3', 2: '4', type: 'SumExp_plus'},
            2: '7',
            type: 'CompareExp_eq',
          },
          2: ['2'],
          type: 'If',
        },
      ],
      1: 'else',
      2: ['3'],
      type: 'Ifs',
    },
  ]],
])

testGroup('loop and break', [
  ['break', [{1: null, type: 'UnaryExp_break'}]],
  ['loop { break 3 }', [
    {1: [{1: '3', type: 'UnaryExp_break'}], type: 'Loop'},
  ]],
])

testGroup('let', [
  ['let a = 3; a', [[{1: 'a', 3: '3', type: 'Let'}], 'a']],
  ['let b = 5; b := 7; b', [
    [{1: 'b', 3: '5', type: 'Let'}],
    {0: 'b', 2: '7', type: 'AssignmentExp_ass'},
    'b',
  ]],
])

testGroup('fn', [
  ['let f = fn(x) {x + 1}; f(1)', [
    [
      {
        1: 'f',
        3: {
          2: ['x'],
          5: [{0: 'x', 2: '1', type: 'SumExp_plus'}],
          type: 'Fn',
        },
        type: 'Let',
      },
    ],
    {
      0: 'f',
      1: {1: ['1'], type: 'Arguments'},
      type: 'CallExp_property_call',
    },
  ]],
])

testGroup('Lists', [
  ['[1, 2, 3]', [{1: ['1', '2', '3'], type: 'List'}]],
  ['[1, 2, 3].length', [
    {
      0: {1: ['1', '2', '3'], type: 'List'},
      2: 'length',
      type: 'PropertyExp_property',
    },
  ]],
  ['[1, 2, 3][1]', [
    {
      0: {1: ['1', '2', '3'], type: 'List'},
      2: '1',
      type: 'PropertyExp_index',
    },
  ]],
  ['let l = [1, 2, 3]; l[1] := 4; l', [
    [
      {
        1: 'l',
        3: {1: ['1', '2', '3'], type: 'List'},
        type: 'Let',
      },
    ],
    {
      0: {0: 'l', 2: '1', type: 'PropertyExp_index'},
      2: '4',
      type: 'AssignmentExp_ass',
    },
    'l',
  ]],
])

testGroup('Objects', [
  ['{}', [{1: [], type: 'Object'}]],
  ['{a: 1, b: 2, c:3}', [
    {
      1: [
        {0: 'a', 2: '1', type: 'PropertyValue'},
        {0: 'b', 2: '2', type: 'PropertyValue'},
        {0: 'c', 2: '3', type: 'PropertyValue'},
      ],
      type: 'Object',
    },
  ]],
  ['let o = {a: 1, b: 2}; o.b := "abc"; o', [
    [
      {
        1: 'o',
        3: {
          1: [
            {0: 'a', 2: '1', type: 'PropertyValue'},
            {0: 'b', 2: '2', type: 'PropertyValue'},
          ],
          type: 'Object',
        },
        type: 'Let',
      },
    ],
    {
      0: {0: 'o', 2: 'b', type: 'PropertyExp_property'},
      2: '"abc"',
      type: 'AssignmentExp_ass',
    },
    'o',
  ]],
  ['let o = {a: 1, b: 2}; o.b := "abc"; o.c := 3; o', [
    [
      {
        1: 'o',
        3: {
          1: [
            {0: 'a', 2: '1', type: 'PropertyValue'},
            {0: 'b', 2: '2', type: 'PropertyValue'},
          ],
          type: 'Object',
        },
        type: 'Let',
      },
    ],
    {
      0: {0: 'o', 2: 'b', type: 'PropertyExp_property'},
      2: '"abc"',
      type: 'AssignmentExp_ass',
    },
    {
      0: {0: 'o', 2: 'c', type: 'PropertyExp_property'},
      2: '3',
      type: 'AssignmentExp_ass',
    },
    'o',
  ]],
])

testGroup('Maps', [
  ['{"a": 1, "b": 2 + 0, 3: 4}', [
    {
      1: [
        {0: '"a"', 2: '1', type: 'KeyValue'},
        {
          0: '"b"',
          2: {0: '2', 2: '0', type: 'SumExp_plus'},
          type: 'KeyValue',
        },
        {0: '3', 2: '4', type: 'KeyValue'},
      ],
      type: 'Map',
    },
  ]],
  ['let t = {"a": 1, "b": 2 + 0, 3: 4}; t["b"] := 1; t', [
    [
      {
        1: 't',
        3: {
          1: [
            {0: '"a"', 2: '1', type: 'KeyValue'},
            {
              0: '"b"',
              2: {0: '2', 2: '0', type: 'SumExp_plus'},
              type: 'KeyValue',
            },
            {0: '3', 2: '4', type: 'KeyValue'},
          ],
          type: 'Map',
        },
        type: 'Let',
      },
    ],
    {
      0: {0: 't', 2: '"b"', type: 'PropertyExp_index'},
      2: '1',
      type: 'AssignmentExp_ass',
    },
    't',
  ]],
])
