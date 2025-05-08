from setuptools import setup, find_packages

setup(
    name="panion",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        line.strip()
        for line in open("requirements.txt")
        if line.strip() and not line.startswith("#")
    ],
    extras_require={
        "test": [
            line.strip()
            for line in open("tests/requirements-test.txt")
            if line.strip() and not line.startswith("#")
        ],
    },
    python_requires=">=3.8",
) 