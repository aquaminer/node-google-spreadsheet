// https://eslint.org/docs/user-guide/configuring
module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:prettier/recommended',
  ],
  plugins: [
    'async-await',
    'prettier',
  ],
  // add your custom rules here
  rules: {
    'no-underscore-dangle': 0,
    'no-plusplus': 0, // i++ OK :D
    'class-methods-use-this': 0,
    'radix': 0,
    'prefer-destructuring': 0,

    // // don't require .js extension when importing
    // 'import/extensions': ['error', 'always', {
    //   js: 'never',
    // }],
    // // allow optionalDependencies
    // 'import/no-extraneous-dependencies': ['error', {
    //   optionalDependencies: ['test/unit/index.js']
    // }],
    // // allow debugger during development
    // 'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // 'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // 'no-unused-vars': process.env.NODE_ENV === 'production'
    //   ? ['warn', { "args": "none" }]
    //   : 'off'
    // ,
    // 'no-plusplus': 0,
    // 'arrow-parens': ["error", "always"], // Forces `(thing) -> thing.x`
    // // sometimes it makes sense if you think the file will soon be expanded
    // 'import/prefer-default-export': 0,
    // 'radix': 0,
    // 'no-restricted-syntax': 0,
    // // bum rules
    // 'prefer-destructuring': 0,
    // 'class-methods-use-this': 0,
    // 'no-mixed-operators': 0,
    // 'no-param-reassign': 0,
  },
  overrides: [
    {
      // extra jest related rules for tests
      files: 'test/*',
      plugins: ["jest"],
      extends: ["plugin:jest/recommended"],
      env: {
        "jest/globals": true,
      },
      rules: {
        "jest/consistent-test-it": "error",
        'no-await-in-loop': 0,
      }
    },
    {
      // relaxed rules for our examples
      files: 'examples/*',
      rules: {
        'no-console': 0,
      },
    },
  ],
}



// {
//   "plugins": ["prettier"],
//   "rules": {
//     "prettier/prettier": "error"
//   }
// }