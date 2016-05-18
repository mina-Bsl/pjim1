#ifndef SIMILARITY_MATRIX_H
#define SIMILARITY_MATRIX_H

#include <vector>
#include <string>
#include <iostream>
#include <iomanip>
#include "json.h"
#include "../lib/json.hpp"

using namespace std;
using json = nlohmann::json;

#define LIMIT_DISPLAY 15

class SimilarityMatrix {
 private:
  int n;                        /* Number of sequences */
  vector<string> labels;        /* Label of each sequence */
  vector<string> descriptions;  /* Description of each sequence */
  float **scores;               /* Array of scores */
  float minV, maxV;

 public:
  SimilarityMatrix(int n);
  ~SimilarityMatrix();

  // Queries
  
  /**
   * @return description of i-th sequence
   */
  string description(int i) const;

  /**
   * @return label of i-th sequence
   */
  string label(int i) const;

  /**
   * @return maximal score
   */ 
  float max() const;

  /**
   * @return minimal score
   */
  float min() const;

  /**
   * @return the number of sequences considered
   */
  int size() const;

  /**
   * @return percentage of similarity between sequence i and j.
   *         Indexes start at 0
   */
  float operator()(int i, int j) const;

  // Commands
  /**
   *@post description(i) == description
   */ 
  void setDescription(int i, string description);

  /**
   * @post label(i) == label
   */
  void setLabel(int i, string label);

  /**
   * @post *this(i, j) == score
   */
  void setScore(int i, int j, float score);

};

class OutputSimilarityMatrix {
 public:
  SimilarityMatrix &matrix;
 private:
  float sim;
  int max_display;

 public:
  /**
   * @param m: the matrix to be displayed
   * @param sim: the level of similarity above which we display the values in a secial way
   * @param max_display: the maximal number of rows or cols to display
   */
  OutputSimilarityMatrix(SimilarityMatrix &m, float sim=100., int max_display = LIMIT_DISPLAY);

  float similarity() const;

  int maxDisplayed() const;
};

class RawOutputSimilarityMatrix: public OutputSimilarityMatrix {
 public:
  RawOutputSimilarityMatrix(SimilarityMatrix &m, float sim=100., int max_display = LIMIT_DISPLAY);
};

class HTMLOutputSimilarityMatrix: public OutputSimilarityMatrix {
 public:
  HTMLOutputSimilarityMatrix(SimilarityMatrix &m, float sim=100., int max_display = LIMIT_DISPLAY);

};

/*Class to export a similarity matrix*/
class JsonOutputSimilarityMatrix: public OutputSimilarityMatrix {
 public:
  JsonOutputSimilarityMatrix(SimilarityMatrix &m, float sim=100., int max_display = LIMIT_DISPLAY);
};

/*Class to export a windows matrix*/
class JsonOutputWindowsMatrix: public OutputSimilarityMatrix {
 public:
  JsonOutputWindowsMatrix(SimilarityMatrix &m, float sim=100., int max_display = LIMIT_DISPLAY);
};

ostream &operator<<(ostream &out, const RawOutputSimilarityMatrix &matrix);
ostream &operator<<(ostream &out, const HTMLOutputSimilarityMatrix &matrix);
json &operator<<(json &out, const JsonOutputSimilarityMatrix &matrix);
json &operator<<(json &out, const JsonOutputWindowsMatrix &matrix);

#endif
