# 🟩 MineQrAft

This project is composed of three parts:  
1. uses code command to simulate human phone interaction.  
2. uses blockly to offer a codeless way to build automatic QA scripts.
3. backend to process functions on automatic phone control

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/yourusername/yourproject.svg)](https://github.com/yourusername/yourproject/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/yourproject.svg)](https://github.com/yourusername/yourproject/issues)

## 📖 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [QuickStart](#-quickstart)
- [License](#-license)
- [Roadmap](#-roadmap)
- [Contact](#-contact)

## ✨ Features

- 🚀 Feature 1: Fast and efficient performance
- 💡 Feature 2: Easy to use and integrate
- 🛡️ Feature 3: Secure and reliable
- 📱 Feature 4: Cross-platform compatibility
- 📦 Feature 5: Close to human experience
- 📈 Feature 6: Easy to build own QA scripts

## 📦 Structure

![image](https://github.com/United-Link/MineQrAft/blob/main/structure.png)

## 🛡️ Prerequisites

Before you begin, ensure you have met the following requirements:  

- Phone setting: developer mode
- Android debug bridge
- Webtool npm 

```bash
# Recommend way
brew install android-platform-tools
brew install node
# Check version
adb version
npm --version
```


## 💡 QuickStart

Pull this repo:

```bash
git clone https://github.com/United-Link/MineQrAft.git

cd MineQrAft
```

Virtual environment by conda:

```bash
conda create -n mqa python=3.10

conda activate mqa

pip install -r requirements.txt
```

Check phone control:  

```bash
cd adb_backend

python adb_api.py
```

New terminal and open process api:  
```bash
conda activate mqa

cd MineQrAft/process_backend

python api.py
```

New terminal and open frontend:  
```bash
cd MineQrAft/frontend

npm install

npm run start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to [contributor-name](https://github.com/contributor-name) for their contributions
- Inspiration from [similar-project](https://github.com/similar-project)
- [Resource or tool](https://example.com) that helped in development

## 📈 Roadmap

- [x] Basic frontend
- [x] Basic backend
- [x] Android device
- [ ] ios device
- [x] Template match
- [x] OCR match
- [ ] Advanced frontend
- [ ] Advanced backend
- [ ] Script generation by LLM

## 📱 Contact

Developer: Leo  
Email: ggcandggc@gmail.com  

## ⭐ Show your support

Give a ⭐️ if this project helped you!
