# Blockly Sample App

## Purpose

This app illustrates how to use Blockly together with common programming tools like node/npm, webpack, typescript, eslint, and others. You can use it as the starting point for your own application and modify it as much as you'd like. It contains basic infrastructure for running, building, testing, etc. that you can use even if you don't understand how to configure the related tool yet. When your needs outgrow the functionality provided here, you can replace the provided configuration or tool with your own.

## Quick Start

1. [Install](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) npm if you haven't before.
2. Run `npm install` to install the required dependencies.
3. Run `npm run start` to run the development server and see the app in action.
4. If you make any changes to the source code, just refresh the browser while the server is running to see them.

## Tooling

The application uses many of the same tools that the Blockly team uses to develop Blockly itself. Following is a brief overview, and you can read more about them on our [developer site](https://developers.google.com/blockly/guides/contribute/get-started/development_tools).

- Structure: The application is built as an npm package. You can use npm to manage the dependencies of the application.
- Modules: ES6 modules to handle imports to/exports from other files.
- Building/bundling: Webpack to build the source code and bundle it into one file for serving.
- Development server: webpack-dev-server to run locally while in development.
- Testing: Mocha to run unit tests.
- Linting: Eslint to lint the code and ensure it conforms with a standard style.
- UI Framework: Does not use a framework. For more complex applications, you may wish to integrate a UI framework like React or Angular.

You can disable, reconfigure, or replace any of these tools at any time, but they are preconfigured to get you started developing your Blockly application quickly.

## Structure

- `package.json` contains basic information about the app. This is where the scripts to run, build, etc. are listed.
- `package-lock.json` is used by npm to manage dependencies
- `webpack.config.js` is the configuration for webpack. This handles bundling the application and running our development server.
- `src/` contains the rest of the source code.
- `dist/` contains the packaged output (that you could host on a server, for example). This is ignored by git and will only appear after you run `npm run build` or `npm run start`.

### Source Code

- `index.html` contains the skeleton HTML for the page. This file is modified during the build to import the bundled source code output by webpack.
- `index.js` is the entry point of the app. It configures Blockly and sets up the page to show the blocks, the generated code, and the output of running the code in JavaScript.
- `index.css` is for web layout design.
- `blocks/MQABlocks.js` is the defenition and code generator of a block function. If a new block and function is created, one should go to this script to add the parameters.
- `adbclient.js` is a class for calling adb api which can directly control the smart phone. If adb backend is updated and a router or a new router is added, this script should be updated correspondingly.
- `toolbox.js` contains the toolbox definition for the app. The current toolbox contains nearly every block that Blockly provides out of the box. You probably want to replace this definition with your own toolbox that uses your custom blocks and only includes the default blocks that are relevant to your application.
- `serialization.js` has code to save and load the workspace using the browser's local storage. This is how your workspace is saved even after refreshing or leaving the page. You could replace this with code that saves the user's data to a cloud database instead.
- `generators/javascript.js` contains the JavaScript generator for the custom text block. You'll need to include block generators for any custom blocks you create, in whatever programming language(s) your application will use.

## Build
- `objects.json` is list of objects which used for click list like: template, text, home and last page.
- `screen_shot.png` is the screen shot of smart phone which is refreshed by adb.
- `templates.json` is the list of templates which is modfied by backend.

## ToDo
- File-modified workspace where user can manage the templates, scripts and files.
- Real-time screen shot which may cause a synchronize issue.
- Time monitor which is for time checking on stream.
- Hot uppdate instead of manually refreshing,.

## Serving

To run your app locally, run `npm run start` to run the development server. This mode generates source maps and ingests the source maps created by Blockly, so that you can debug using unminified code.

To deploy your app so that others can use it, run `npm run build` to run a production build. This will bundle your code and minify it to reduce its size. You can then host the contents of the `dist` directory on a web server of your choosing. If you're just getting started, try using [GitHub Pages](https://pages.github.com/).
