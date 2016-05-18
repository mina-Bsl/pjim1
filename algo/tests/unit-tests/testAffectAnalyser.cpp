#include "tests.h"
#include <core/affectanalyser.h>
#include <core/kmerstore.h>
#include <core/kmeraffect.h>

template<template <class> class T>
void testAffectAnalyser1() {
  const int k = 4;
  const bool revcomp = false;

  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);
  
  string sequence = "AAAACCCCCGGGGG";
  KmerAffectAnalyser kaa(*index, sequence);
  CountKmerAffectAnalyser ckaa(*index, sequence);
  TAP_TEST(ckaa.getAllowedOverlap() == 0, TEST_COUNT_AA_GET_OVERLAP, "");
  ckaa.setAllowedOverlap(k-1);

  set<KmerAffect> forbidden;
  forbidden.insert(KmerAffect::getAmbiguous());
  forbidden.insert(KmerAffect::getUnknown());

  TAP_TEST(ckaa.getAllowedOverlap() == k-1, TEST_COUNT_AA_GET_OVERLAP, "");
  TAP_TEST(ckaa.getSequence() == "AAAACCCCCGGGGG", TEST_AA_GET_SEQUENCE, "actual: " << ckaa.getSequence());

  for (int i = 2; i < nb_seq-1; i++) {
    // i starts at 2 because AAAA is not found: there is an ambiguity with
    // AAAA coming from AAAACAAAACAAAAC or AAAAAAAAAAAAAAA
    KmerAffect current_affect(seq[2*i+1], 1);
    TAP_TEST(kaa.count(current_affect) == 0, TEST_AA_COUNT, "");
    TAP_TEST(ckaa.count(current_affect) == 0, TEST_COUNT_AA_COUNT, ckaa.count(current_affect));
    TAP_TEST(kaa.first(current_affect) == (int)string::npos, TEST_AA_FIRST, "");
    TAP_TEST(kaa.last(current_affect) == (int)string::npos, TEST_AA_LAST, "");
  }
  for (int i = 0; i < 2; i++) {
    KmerAffect current_affect(seq[2*i+1], 1);
    TAP_TEST(kaa.count(current_affect) == 2, TEST_AA_COUNT, kaa.count(current_affect));
    TAP_TEST(ckaa.count(current_affect) == 2, TEST_COUNT_AA_COUNT, ckaa.count(current_affect));
    TAP_TEST(kaa.getAffectation(kaa.first(current_affect)) == current_affect, TEST_AA_GET_AFFECT, "");
    TAP_TEST(kaa.getAffectation(kaa.last(current_affect)) == current_affect, TEST_AA_GET_AFFECT, "");
  }
  TAP_TEST(kaa.count(KmerAffect(seq[2*(nb_seq-1)+1], 1)) == 1, TEST_AA_COUNT, "");
  TAP_TEST((kaa.first(KmerAffect(seq[2*(nb_seq-1)+1], 1)) 
          == kaa.last(KmerAffect(seq[2*(nb_seq-1)+1], 1)))
           == 1, TEST_AA_FIRST, "");

  TAP_TEST(ckaa.max(forbidden) == KmerAffect("C lots of", 1)
           || ckaa.max(forbidden) == KmerAffect("G lots of", 1), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));

  TAP_TEST(ckaa.max() == KmerAffect::getUnknown(), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max());

  TAP_TEST(kaa.getAffectation(3).isUnknown(), TEST_AA_PREDICATES, "");
  TAP_TEST(kaa.getAffectation(8).isUnknown(), TEST_AA_PREDICATES, "");
  TAP_TEST(kaa.getAffectation(0).isAmbiguous(), TEST_AA_PREDICATES, "");
  
  TAP_TEST(kaa.getDistinctAffectations().size() == 5, TEST_AA_GET_DISTINCT_AFFECT, "");

  KmerAffect cAffect = KmerAffect(seq[1], 1);
  KmerAffect gAffect = KmerAffect(seq[3], 1);
  TAP_TEST(ckaa.countBefore(cAffect, 0) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(gAffect, 0) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countAfter(cAffect, 10) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countAfter(gAffect, 10) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST(ckaa.countBefore(cAffect, 4) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(cAffect, 5) == 1, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countAfter(cAffect, 4) == 1, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(cAffect, 5) == 0, TEST_COUNT_AA_COUNT_AFTER, "");

  TAP_TEST(ckaa.countAfter(gAffect, 4) == 2, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(gAffect, 5) == 2, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countBefore(gAffect, 4) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(gAffect, 5) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST(ckaa.countBefore(cAffect, 9) == 2, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(cAffect, 10) == 2, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countAfter(cAffect, 9) == 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(cAffect, 10) == 0, TEST_COUNT_AA_COUNT_AFTER, "");

  TAP_TEST(ckaa.countAfter(gAffect, 9) == 1, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countAfter(gAffect, 10) == 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countBefore(gAffect, 9) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");
  TAP_TEST(ckaa.countBefore(gAffect, 10) == 1, TEST_COUNT_AA_COUNT_BEFORE, "");

  TAP_TEST(ckaa.firstMax(cAffect, gAffect) == 6, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(cAffect, gAffect) == 8, TEST_COUNT_AA_LAST_MAX, ckaa.lastMax(cAffect, gAffect));

  // Test affectation with two affects that are not in the sequence
  KmerAffect aAffect = KmerAffect(seq[5], 1);
  KmerAffect tAffect = KmerAffect(seq[7], 1);
  TAP_TEST(ckaa.firstMax(aAffect, tAffect) == -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(aAffect, tAffect) == - 1, 
           TEST_COUNT_AA_LAST_MAX, "");
  TAP_TEST(ckaa.countAfter(tAffect, 4) == 0, TEST_COUNT_AA_COUNT_AFTER, "");
  TAP_TEST(ckaa.countBefore(tAffect, 4) == 0, TEST_COUNT_AA_COUNT_BEFORE, "");

  // Test affectation with one affect not in the sequence

  TAP_TEST(ckaa.firstMax(cAffect, tAffect) == -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(cAffect, tAffect) == -1, 
           TEST_COUNT_AA_LAST_MAX, "");

  TAP_TEST(ckaa.firstMax(aAffect, gAffect) == -1, TEST_COUNT_AA_FIRST_MAX, "");
  TAP_TEST(ckaa.lastMax(aAffect, gAffect) == -1, TEST_COUNT_AA_LAST_MAX, "");
  delete index;
}

// Test with revcomp
template<template <class> class T>
void testAffectAnalyser2() {
  const int k = 5;
  const bool revcomp = true;
  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);
  string sequence = "TTTTTGGGGG";
  KmerAffectAnalyser kaa(*index, sequence);
  CountKmerAffectAnalyser ckaa(*index, sequence);
  ckaa.setAllowedOverlap(k-1);

  set<KmerAffect> forbidden;
  forbidden.insert(KmerAffect::getAmbiguous());
  forbidden.insert(KmerAffect::getUnknown());
  
  TAP_TEST(kaa.getSequence() == "TTTTTGGGGG", TEST_AA_GET_SEQUENCE, "actual: ");
  TAP_TEST(ckaa.getSequence() == "TTTTTGGGGG", TEST_AA_GET_SEQUENCE, "actual: " << ckaa.getSequence());

  TAP_TEST(kaa.getAffectation(1) == KmerAffect(seq[2*(nb_seq-1)+1], -1), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.count(kaa.getAffectation(1)) == 1, TEST_AA_GET_AFFECT, "");
  TAP_TEST(ckaa.count(kaa.getAffectation(1)) == 1, TEST_COUNT_AA_COUNT, "");
  TAP_TEST(kaa.getAffectation(0) == kaa.getAffectation(10 - k), TEST_AA_GET_AFFECT, "");
  TAP_TEST(kaa.getAffectation(0).isAmbiguous(), TEST_AA_PREDICATES, "");

  for (int i = 2; i < 10 - k; i++)
    TAP_TEST(kaa.getAffectation(i).isUnknown(), TEST_AA_PREDICATES, "");

  TAP_TEST(kaa.getDistinctAffectations().size() == 3, TEST_AA_GET_DISTINCT_AFFECT, "");

  TAP_TEST(ckaa.max(forbidden) == KmerAffect(seq[2*(nb_seq-1)+1], -1), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));

  TAP_TEST(ckaa.max() == KmerAffect::getUnknown(), 
           TEST_COUNT_AA_MAX, "max is " << ckaa.max());

  for (int i = 0; i < 10 - k; i++)
    TAP_TEST(kaa.getAffectation(i) == kaa.getAllAffectations(AO_NONE)[i], TEST_AA_GET_ALL_AO_NONE, "");

  TAP_TEST(kaa.getAffectation(0) == kaa.getAllAffectations(AO_NO_CONSECUTIVE)[0], TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "");
  TAP_TEST(kaa.getAllAffectations(AO_NO_CONSECUTIVE).size() == 4, TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "size = " << kaa.getAllAffectations(AO_NO_CONSECUTIVE).size());
  TAP_TEST(kaa.getAffectation(1) == kaa.getAllAffectations(AO_NO_CONSECUTIVE)[1], TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, "actual: " << kaa.getAllAffectations(AO_NO_CONSECUTIVE)[1] << ", expected: " << kaa.getAffectation(1));
  TAP_TEST(kaa.getAffectation(2) == kaa.getAllAffectations(AO_NO_CONSECUTIVE)[2], TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, kaa.getAllAffectations(AO_NO_CONSECUTIVE)[2] << ", expected: " << kaa.getAffectation(2));
  TAP_TEST(kaa.getAllAffectations(AO_NO_CONSECUTIVE)[3] == kaa.getAffectation(10-k), TEST_AA_GET_ALL_AO_NO_CONSECUTIVE, kaa.getAllAffectations(AO_NO_CONSECUTIVE)[3] << ", expected: " << kaa.getAffectation(10-k));

  delete index;
}


template<template <class> class T>
void testAffectAnalyserMaxes() {
  const int k = 4;
  const bool revcomp = false;

  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);
  
  string sequence = "ACCCCAGGGGGA";
  CountKmerAffectAnalyser ckaa(*index, sequence);

  KmerAffect cAffect = KmerAffect("C", 1);
  KmerAffect gAffect = KmerAffect("G", 1);

  set<KmerAffect> forbidden;
  forbidden.insert(KmerAffect::getAmbiguous());
  forbidden.insert(KmerAffect::getUnknown());

  TAP_TEST(ckaa.max(forbidden) == gAffect, TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));
  TAP_TEST(ckaa.max12(forbidden).first == gAffect, TEST_COUNT_AA_MAX12, "max1 is " << ckaa.max12(forbidden).first);
  TAP_TEST(ckaa.max12(forbidden).second == cAffect, TEST_COUNT_AA_MAX12, "max2 is " << ckaa.max12(forbidden).second);

  TAP_TEST(ckaa.sortLeftRight(ckaa.max12(forbidden)).first == cAffect, TEST_AA_SORT_LEFT_RIGHT, "bad max12, left");
  TAP_TEST(ckaa.sortLeftRight(ckaa.max12(forbidden)).second == gAffect, TEST_AA_SORT_LEFT_RIGHT, "bad max12, right");

  forbidden.insert(gAffect);
  TAP_TEST(ckaa.max(forbidden) == cAffect, TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));
  TAP_TEST(ckaa.max12(forbidden).first == cAffect, TEST_COUNT_AA_MAX12, "max1 is " << ckaa.max12(forbidden).first);
  TAP_TEST(ckaa.max12(forbidden).second == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX12, "max2 is " << ckaa.max12(forbidden).second);

  forbidden.insert(cAffect);
  TAP_TEST(ckaa.max(forbidden) == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX, "max is " << ckaa.max(forbidden));
  TAP_TEST(ckaa.max12(forbidden).first == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX12, "max1 is " << ckaa.max12(forbidden).first);
  TAP_TEST(ckaa.max12(forbidden).second == KmerAffect::getUnknown(), TEST_COUNT_AA_MAX12, "max2 is " << ckaa.max12(forbidden).second);

  delete index;
}

template<template <class> class T>
void testGetMaximum() {
  const int k = 4;
  const bool revcomp = true;
  T<KmerAffect> *index = createIndex<T<KmerAffect> >(k, revcomp);

  KmerAffect a[] = {AFFECT_J_BWD, AFFECT_J_BWD, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_V_BWD, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_J_BWD, AFFECT_J_BWD};
  //  0 1 2 3 4 5 6 7 8 9  11  13
  // J-J- _ _ _ _V-V-V- _ _ _J-J-
  vector<KmerAffect> affectations(a, a+sizeof(a)/sizeof(KmerAffect));

  KmerAffectAnalyser kaa(*index, "", affectations);
  TAP_TEST(kaa.getSequence() == "", TEST_AA_GET_SEQUENCE, "");

  affect_infos results = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 2., 0);
  TAP_TEST(! results.max_found, TEST_AA_GET_MAXIMUM_MAX_FOUND, 
           "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");

  results = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 0.9, 0);
  TAP_TEST(results.max_found , 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST(results.first_pos_max == 5 && results.last_pos_max == 5,
           TEST_AA_GET_MAXIMUM_POSITIONS,"(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST(results.max_value == 2, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);

  results = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 0.9, k);
  TAP_TEST(results.max_found, 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST(results.first_pos_max == 1 && results.last_pos_max == 5,
           TEST_AA_GET_MAXIMUM_POSITIONS,"(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST(results.max_value == 2, TEST_AA_GET_MAXIMUM_VALUE, "");

  affect_infos results2 = kaa.getMaximum(AFFECT_J_BWD, AFFECT_V_BWD, 0.9, k+5);
  TAP_TEST(results == results2, TEST_AA_GET_MAXIMUM_VALUE, "");

  KmerAffect a2[] = {AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, 
                     AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V,
                     AFFECT_J, AFFECT_J, AFFECT_J,
                     AFFECT_V, AFFECT_V, AFFECT_V};
  //  0 1 2 3 4 5 6 7 8 9  11  13  15
  // V+V+V+V+V+V+V+V+V+V+J+J+J+V+V+V+
  vector<KmerAffect> affectations2(a2, a2+sizeof(a2)/sizeof(KmerAffect));
  KmerAffectAnalyser kaa2(*index, "", affectations2);
  results = kaa2.getMaximum(AFFECT_V, AFFECT_J, 2., 0);
  TAP_TEST(! results.max_found, 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");

  results = kaa2.getMaximum(AFFECT_V, AFFECT_J, 1., k);
  TAP_TEST(! results.max_found, 
           TEST_AA_GET_MAXIMUM_MAX_FOUND, "(" << results.first_pos_max
           << ", " << results.last_pos_max << ")");
  TAP_TEST(results.max_value == 10, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);
  TAP_TEST(results.first_pos_max == 9
           && results.last_pos_max == 15, TEST_AA_GET_MAXIMUM_POSITIONS,
           "max positions: [" << results.first_pos_max << ", " 
           << results.last_pos_max << "]");
  TAP_TEST(results.nb_before_right == 0 && results.nb_after_right == 0, 
           TEST_AA_GET_MAXIMUM_COUNTS, 
           "before right: " << results.nb_before_right
           << ", after right: " << results.nb_after_right);

  results = kaa2.getMaximum(AFFECT_V_BWD, AFFECT_J_BWD);
  // No result

  TAP_TEST(! results.max_found,
           TEST_AA_GET_MAXIMUM_MAX_FOUND, 
           "(" << results.first_pos_max << ", " 
           << results.last_pos_max << ")");
  TAP_TEST(results.max_value == 0, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);

  
  KmerAffect a3[] = {AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, 
                     AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V, AFFECT_V,
                     AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN,
                     AFFECT_UNKNOWN, AFFECT_UNKNOWN, AFFECT_UNKNOWN,
                     AFFECT_J, AFFECT_J, AFFECT_V, AFFECT_J};
  //  0 1 2 3 4 5 6 7 8 9  11  13  15  17  19
  // V+V+V+V+V+V+V+V+V+V+ _ _ _ _ _ _J-J-V+J-
  vector<KmerAffect> affectations3(a3, a3+sizeof(a3)/sizeof(KmerAffect));
  KmerAffectAnalyser kaa3(*index, "", affectations3);
  results = kaa3.getMaximum(AFFECT_V, AFFECT_J, 2., 0);

  TAP_TEST(results.max_found, TEST_AA_GET_MAXIMUM_MAX_FOUND,
           "max_found = " << results.max_found);
  TAP_TEST(results.max_value, TEST_AA_GET_MAXIMUM_VALUE,
           "max = " << results.max_value);
  TAP_TEST(results.first_pos_max == 13 && results.last_pos_max == 15,
           TEST_AA_GET_MAXIMUM_POSITIONS, 
           "first = " << results.first_pos_max 
           << ", last = " << results.last_pos_max);
  TAP_TEST(results.nb_before_left == 10 && results.nb_before_right == 1
           && results.nb_after_left == 0 && results.nb_after_right == 3,
           TEST_AA_GET_MAXIMUM_COUNTS, 
           "before:: left: " << results.nb_before_left <<", right: " 
           << results.nb_before_right << "\nafter:: left: " 
           << results.nb_after_left << ", right: " 
           << results.nb_after_right);

  delete index;
}

/**
 * A sequence and its revcomp are not affected in the same way.
 */
template<template <class> class T>
void testBugAffectAnalyser() {
  Fasta seqV("../../germline/IGHV.fa", 2);
  Fasta seqJ("../../germline/IGHJ.fa", 2);
  Fasta data("../../data/bug-revcomp.fa", 1, " ");

  T<KmerAffect> index(9, true);
  index.insert(seqV, "V");
  index.insert(seqJ, "J");

  TAP_TEST(data.size() == 2, TEST_FASTA_SIZE, 
           "Should have 2 sequences (one seq and its revcomp), " 
           << data.size() << " instead");

  TAP_TEST(data.read(0).sequence.size() == data.read(1).sequence.size(),
           TEST_FASTA_SEQUENCE, 
           "Sequences should be of same length: sequence and its revcomp");

  KmerAffectAnalyser fwdAffect(index, data.read(0).sequence);
  KmerAffectAnalyser bwdAffect(index, data.read(1).sequence);

  int total = fwdAffect.count();

  TAP_TEST(fwdAffect.getSequence() == data.read(0).sequence, TEST_AA_GET_SEQUENCE, "actual: " << fwdAffect.getSequence() << ", expected: " << data.read(0).sequence);
  TAP_TEST(bwdAffect.getSequence() == data.read(1).sequence, TEST_AA_GET_SEQUENCE, "actual: " << bwdAffect.getSequence() << ", expected: " << data.read(1).sequence);

  TAP_TEST(fwdAffect.count() == bwdAffect.count(),
           TEST_AA_COUNT,
           "Both sequences should have the same amount of affectations. "
           << fwdAffect.count() << " for the fwd, and " << bwdAffect.count()
           << " for the bwd instead");

  for (int i = 0; i < total; i++) {
    const KmerAffect fwd = fwdAffect.getAffectation(i);
    const KmerAffect bwd = bwdAffect.getAffectation(total - 1 - i);

    if (fwd.isAmbiguous() || bwd.isAmbiguous()
        || fwd.isUnknown() || bwd.isUnknown()) {
      TAP_TEST(fwd == bwd, TEST_AA_PREDICATES, 
               "If ambiguous or unknown, both affectations should be the same (fwd="
               << fwd << ", bwd=" << bwd << ", i= " << i << ") "
               << __PRETTY_FUNCTION__);
    } else {
      TAP_TEST(fwd.getLabel() == bwd.getLabel(), TEST_AA_REVCOMP_LABEL,
               "Label should be the same, instead: fwd=" << fwd.getLabel()
               << ", bwd=" << bwd.getLabel() << ", i=" <<i
               << " " << __PRETTY_FUNCTION__);
      TAP_TEST(-1*fwd.getStrand() == bwd.getStrand(), TEST_AA_REVCOMP_STRAND,
               "Strands should be the opposite, instead: fwd=" << fwd.getStrand()
               << ", bwd=" << bwd.getStrand() << ", i=" << i << " "
               << __PRETTY_FUNCTION__);
    }
  }
}

void testAffectAnalyser() {
  testAffectAnalyser1<MapKmerStore>();
  testAffectAnalyser2<MapKmerStore>();
  testBugAffectAnalyser<MapKmerStore>();
  testGetMaximum<MapKmerStore>();

  testAffectAnalyser1<ArrayKmerStore>();
  testAffectAnalyser2<ArrayKmerStore>();
  testAffectAnalyserMaxes<ArrayKmerStore>();
  testBugAffectAnalyser<ArrayKmerStore>();
  testGetMaximum<ArrayKmerStore>();
}
