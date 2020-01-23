from setuptools import setup, find_packages

setup(
    name='threeviz',
    version="0.0.1",
    packages=find_packages(),
    install_requires=['tornado', 'numpy', 'tiny_tf', 'msgpack'])
