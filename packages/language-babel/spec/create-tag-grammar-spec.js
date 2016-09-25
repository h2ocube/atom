var Range = require('atom').Range;
var Point = require('atom').Point;
var temp = require('temp');
var fs = require('fs-plus');
var path = require('path');
var CreateTtlGrammar = require('../lib/create-ttl-grammar');

temp.track();

describe('Create Ttl Grammar', () => {
  var ttlGrammar = null;

  beforeEach(() => {
    temp.cleanup();
    waitsForPromise(() => {
      return atom.packages.activatePackage('language-babel');
    });

    return runs(() => {
      ttlGrammar = new CreateTtlGrammar();

    });
  });

  afterEach(() => {
    ttlGrammar.destroy();
    delete ttlGrammar;
  });

  describe('::getTtlConfig', () => {
    return it(
      'should return an array containing the tagged template extensions configuration',
      () => {
        return expect(ttlGrammar.getTtlConfig()).toEqual([]);
      }
    );
  });

  describe('::generateTtlSHA256', () => {
    return it(
      'should return SHA256 hash some text',
      () => {
        return expect(ttlGrammar.generateTtlSHA256('The Quick Fox')).toEqual('4af51dbb709ee9d85987ca5982e322ee2ec4d72ae8c92f11c5728813277e6b33');
      }
    );
  });

  describe('::makeTtlGrammarFilename', () => {
    return it(
      'should return a string prefixed with ttl-',
      () => {
        expect(ttlGrammar.makeTtlGrammarFilename('filename')).toEqual('ttl-filename.json');
      }
    );
  });

  describe('::getGrammarPath', () => {
    return it(
      'should return an absolute path where the language-babel grammar files are',
      () => {
        expect(path.isAbsolute(ttlGrammar.getGrammarPath())).toEqual(true);
      }
    );
  });

  describe('::makeTtlGrammarFilenameAbsoulute', () => {
    return it(
      'should return an absolute path with a filename ',
      () => {
        expect(path.isAbsolute(ttlGrammar.makeTtlGrammarFilenameAbsoulute('someFile'))).toEqual(true);
      }
    );
  });

  describe('::getGrammarFiles', () => {
    return it(
      'should return a list of all language-babel grammar files including Babel Language.json',
      () => {
        waitsForPromise(() => {
          return ttlGrammar.getGrammarFiles().then( (grammarFiles) => {
            expect(grammarFiles).toContain('Babel Language.json');
          })
        });
      }
    );
  });

  describe('::getTtlGrammarFiles', () => {
    return it(
      'should return a list of language-babel grammar with a ttl- prefix',
      () => {
        waitsForPromise(() => {
          return ttlGrammar.getTtlGrammarFiles().then( (grammarFiles) => {
            expect(grammarFiles).toMatch(/^ttl-/);
          })
        });
      }
    );
  });

  describe('::noGrammarFileExists', () => {
    return it(
      'checks if no grammar file exists',
      () => {
        waitsForPromise(() => {
          return ttlGrammar.noGrammarFileExists('Babel Language.json').catch( (rejVal) => {
            expect(rejVal).toEqual({err: false, module: 'noGrammarFileExists'})
          });
        });
      }
    );
  });

  describe('::removeTtlLanguageFiles', () => {
    return it(
    'should remove any files ttl-hashedvalue.json',
    () => {
      var tempGrammarDir = temp.mkdirSync();
      var tempGrammarFile1 = temp.open('ttl-a.json');
      var tempGrammarFile2 = temp.open('ttl-b.json');
      var tempGrammarFile3 = temp.open('ttl-c.json');

      spyOn(ttlGrammar, 'getGrammarPath').andReturn(tempGrammarDir);

      waitsForPromise( () => {
        return ttlGrammar.removeTtlLanguageFiles()
          // Previous fs.unlink's queue a delete in Node so delay check
          .then( () => setTimeout(()=>void(0) ,1000) )
          .then( () => ttlGrammar.getTtlGrammarFiles() )
          .then( (ttlFiles) => expect(ttlFiles).toEqual([]) )
        });
      }
    );
  });

  describe('::createGrammarPatterns', () => {
    return it(
      'should generate an error when a badly formatted ttl config is entered',
      () => {
        expect(() => ttlGrammar.createGrammarPatterns('/* test */:trailing.dot.#include')).toThrow();
      }
    );
  });

  // Ensure we finish off by creating a valid ttl file
  describe('::observeTtlConfig', () => {
    return it(
      'should create a valid ttl grammar file based upon some defined config',
      () => {
        var tempGrammarDir = temp.mkdirSync();

        spyOn(ttlGrammar, 'getGrammarPath').andReturn(tempGrammarDir);
        spyOn(ttlGrammar, 'getTtlConfig').andReturn(['/* html */:text.html.basic','sql:source.sql']);

        const grammarText = ttlGrammar.createGrammarText();
        const hash = ttlGrammar.generateTtlSHA256(grammarText);
        const ttlFilename = ttlGrammar.makeTtlGrammarFilename(hash);
        const ttlFilenameAbsolute = ttlGrammar.makeTtlGrammarFilenameAbsoulute(ttlFilename);
        waitsForPromise(() => {
          return ttlGrammar.createGrammar({ttlFilename, ttlFilenameAbsolute, grammarText }).then( (val) => {
            expect(val).toEqual('ttl-b6536e72fc27ff522b4a17c8bbbb178a5de193d8c3f5ec8aa772c7569eb28ecc.json');
          });
        });
      }
    );
  });

});
