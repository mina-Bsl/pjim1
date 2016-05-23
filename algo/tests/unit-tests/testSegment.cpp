
#include <fstream>
#include <iostream>
#include <string>
#include "core/germline.h"
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/segment.h"
#include "core/windowExtractor.h"

using namespace std;



void testOverlap()
{
  AlignBox *box_A = new AlignBox() ;
  AlignBox *box_C = new AlignBox() ;

  box_A->ref = "AAAAAAAAAA";
  box_C->ref = "TCCCCCCCCC";

  // here box_A.ref and box_C.ref do not actullay overlap, but the goal is to find the good split point
  string seq = "AAAAAAACCACCCCCC";
  // positions -->    6..9

  box_A->end = 9;
  box_C->ref = 6;  // this value is not really meaningful here, but allows anyway to test the function

  check_and_resolve_overlap(seq, 0, seq.length(),
                            box_A, box_C, VDJ);

  TAP_TEST(box_A->del_right == 3, TEST_FINE_SEGMENT_OVERLAP, "number of trim nucleotides : " << box_A);
  TAP_TEST(box_C->del_left == 1, TEST_FINE_SEGMENT_OVERLAP, "number of trim nucleotides : " << box_C);

  TAP_TEST(box_A->end == 6, TEST_FINE_SEGMENT_OVERLAP, "end position of left region : " << box_A);
  TAP_TEST(box_C->start == 7,  TEST_FINE_SEGMENT_OVERLAP, "start position of right region : " << box_C);

  delete box_A;
  delete box_C;
}

void testFineSegment()
{
  Fasta seqV("../../germline/IGHV.fa", 2);
  Fasta seqD("../../germline/IGHD.fa", 2);
  Fasta seqJ("../../germline/IGHJ.fa", 2);
  
  OnlineFasta data("../../data/Stanford_S22.fasta", 1, " ");
  data.next();
  data.next();

  Germline *germline ;
  germline = new Germline("IGH", 'G', seqV, seqD, seqJ, 0);
  germline->new_index("########");

  Sequence seq = data.getSequence();
      
  //segmentation VJ
  FineSegmenter s(seq, germline, VDJ);
	
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  
  //segmentation D
  s.FineSegmentD(germline, false);
  
  TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VDJ)") ;

  // Revcomp sequence and tests that the results are the same.
  seq.sequence = revcomp(seq.sequence);
  FineSegmenter s2(seq, germline, VDJ);

  TAP_TEST(s2.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VJ)") ;
  //segmentation D
  s2.FineSegmentD(germline, false);
  TAP_TEST(s2.isSegmented(), TEST_SEGMENT_POSITION, "is segmented (VDJ)") ;
  
  TAP_TEST(s.getLeft() == s2.getLeft(), TEST_SEGMENT_REVCOMP, " left segmentation position");
  TAP_TEST(s.getRight() == s2.getRight(), TEST_SEGMENT_REVCOMP, " right segmentation position");
  TAP_TEST(s.getLeftD() == s2.getLeftD(), TEST_SEGMENT_REVCOMP, " left D segmentation position");
  TAP_TEST(s.getRightD() == s2.getRightD(), TEST_SEGMENT_REVCOMP, " right D segmentation position");
  TAP_TEST(s.isReverse() == !s2.isReverse(), TEST_SEGMENT_REVCOMP, " sequence reversed");
  TAP_TEST(s.info.substr(1) == s2.info.substr(1), TEST_SEGMENT_REVCOMP, " info string " << endl <<
           "s  = " << s.info << endl <<
	   "s2 = " << s2.info);
  TAP_TEST(s.info.substr(0,1) != s2.info.substr(0,1), TEST_SEGMENT_REVCOMP, "first character (strand) of info string " << endl <<
           "s  = " << s.info << endl <<
	   "s2 = " << s2.info);

  TAP_TEST(s.code == s2.code, TEST_SEGMENT_REVCOMP, " code string");
  delete germline;
}

/**
 * Test segmentation when there is an overlap between V and J (and no N)
 */
void testSegmentOverlap()
{
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  Fasta data("../../data/bug-segment-overlap.fa", 1, " ");
  
  Germline *germline1 ;
  germline1 = new Germline("TRG", 'G', seqV, Fasta(), seqJ, -50);
  germline1->new_index("##########");

  Germline *germline2 ;
  germline2 = new Germline("TRG2", 'G', seqV, Fasta(), seqJ, -50);
  germline2->new_index("##########");

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter ks(data.read(i), germline1);

    TAP_TEST(ks.seg_V + ks.seg_N + ks.seg_J == data.sequence(i)
             || ks.seg_V + ks.seg_N + ks.seg_J == revcomp(data.sequence(i)), 
             TEST_KMER_SEGMENT_OVERLAP,
             " V= " << ks.seg_V << ", N = " << ks.seg_N << ", J = " << ks.seg_J);

    FineSegmenter fs(data.read(i), germline2, VDJ); 
    TAP_TEST(fs.seg_V + fs.seg_N + fs.seg_J == data.sequence(i)
             || fs.seg_V + fs.seg_N + fs.seg_J == revcomp(data.sequence(i)), 
             TEST_FINE_SEGMENT_OVERLAP,
             " V= " << fs.seg_V << ", N = " << fs.seg_N << ", J = " << fs.seg_J);
  }

  delete germline1;
  delete germline2;
}

void testSegmentationCause() {
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  Fasta data("../../data/segmentation.fasta", 1, " ");

  Germline *germline ;
  germline = new Germline("TRG", 'G', seqV, Fasta(), seqJ, 0);
  germline->new_index("##########");

  int nb_checked = 0;

  for (int i = 0; i < data.size(); i++) {
    KmerSegmenter ks(data.read(i), germline);
    
    if (data.read(i).label == "seq-seg+") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "seq is " << data.label(i));
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA"
               || ks.getJunction(30) == "TGCCACCTGGGACAGGGAATTATTATAAGA", 
               TEST_KMER_JUNCTION, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getLeft() == 17, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST(ks.getRight() == 18, TEST_KMER_RIGHT, "right = " << ks.getRight());

      ks.setSegmentationStatus(NOT_PROCESSED);
      TAP_TEST(! ks.isSegmented(), TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == NOT_PROCESSED, TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      ks.setSegmentationStatus(SEG_PLUS);
      TAP_TEST(ks.isSegmented(), TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus(), TEST_SET_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-seg-") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == SEG_MINUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(30) == "GCCACCTGGGACAGGGAATTATTATAAGAA"
               || ks.getJunction(30) == "TGCCACCTGGGACAGGGAATTATTATAAGA", 
               TEST_KMER_JUNCTION, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getLeft() == 17, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST(ks.getRight() == 18, TEST_KMER_RIGHT, "right = " << ks.getRight());
      nb_checked++;
    } else if (data.read(i).label == "seq-short") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_SHORT, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-strand") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_STRAND_NOT_CONSISTENT, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-zero") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_ZERO, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewV") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewV: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_V, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewJ") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewJ: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_J, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewV-rc") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewV-rc: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_V, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewJ-rc") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewJ-rc: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_J, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewV2") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewV2: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_V, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-fewJ2") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "fewJ2: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_TOO_FEW_J, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-ambiguous-VJVJ") {
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "ambiguous-VJVJ: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_AMBIGUOUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-min") {
      // This test was a test for delta_min but the read is now reported as ambiguous,
      // as they are, at the left of the segmentation point, not twice more "V" k-mers than "J" k-mers.
      // We keep the test, but change it.
      TAP_TEST(! ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "delta-min: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == UNSEG_AMBIGUOUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      nb_checked++;
    } else if (data.read(i).label == "seq-delta-min-padded") {
      // This one has enough k-mers to be segmented
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, "delta-min: " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(21) == "GGCAGTTGGAACAACACTTGT",
               TEST_KMER_JUNCTION, "window: " << ks.getJunction(21));
      TAP_TEST(ks.getLeft() == 69, TEST_KMER_LEFT, "left = " << ks.getLeft() << ", " << ks.getInfoLineWithAffects());
      TAP_TEST(ks.getRight() == 79, TEST_KMER_RIGHT, "right = " << ks.getRight() << ", " << ks.getInfoLineWithAffects());
    } else if (data.read(i).label == "seq-seg-no-window") {
      TAP_TEST(ks.isSegmented(), TEST_KMER_IS_SEGMENTED, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getSegmentationStatus() == SEG_PLUS, TEST_KMER_SEGMENTATION_CAUSE, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getLeft() == 11, TEST_KMER_LEFT, "left = " << ks.getLeft());
      TAP_TEST(ks.getRight() == 12, TEST_KMER_RIGHT, "right = " << ks.getRight());
      TAP_TEST(ks.getJunction(30) == "", TEST_KMER_JUNCTION, ks.getInfoLineWithAffects());
      TAP_TEST(ks.getJunction(20) == "CTGGGACAGGGAATTATTAT"
               || ks.getJunction(20) == "CCTGGGACAGGGAATTATTA", TEST_KMER_JUNCTION,"window: " << ks.getJunction(20));
      nb_checked++;
    }
  }
  
  TAP_TEST(nb_checked == 14, TEST_KMER_DATA, "");

  delete germline;
}

void testExtractor() {
  Fasta seqV("../../germline/TRGV.fa", 2);
  Fasta seqJ("../../germline/TRGJ.fa", 2);
  
  OnlineFasta data("../../data/segmentation.fasta", 1, " ");

  Germline *germline ;
  germline = new Germline("TRG", 'G', seqV, Fasta(), seqJ, 0, 0);
  germline->new_index("##########");

  MultiGermline *multi ;
  multi = new MultiGermline();
  multi->insert(germline);

  WindowExtractor we(multi);
  map<string, string> labels;
  ofstream out_seg("segmented.log");
  ofstream out_unseg("unsegmented.log");
  we.setSegmentedOutput(&out_seg);
  we.setUnsegmentedOutput(&out_unseg);

  WindowsStorage *ws = we.extract(&data, 30, labels);
  // we.out_stats(cout);

  TAP_TEST(we.getNbReads() == 15, TEST_EXTRACTOR_NB_READS, "");

  TAP_TEST(we.getNbSegmented(SEG_PLUS) == 2, TEST_EXTRACTOR_NB_SEGMENTED, "segPlus: " << we.getNbSegmented(SEG_PLUS));
  TAP_TEST(we.getNbSegmented(SEG_MINUS) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_SHORT) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_STRAND_NOT_CONSISTENT) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_ZERO) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_V) == 3, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_FEW_J) == 3, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_BAD_DELTA_MIN) == 0, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_AMBIGUOUS) == 2, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(UNSEG_TOO_SHORT_FOR_WINDOW) == 1, TEST_EXTRACTOR_NB_SEGMENTED, "");
  TAP_TEST(we.getNbSegmented(TOTAL_SEG_AND_WINDOW) == 3, TEST_EXTRACTOR_NB_SEGMENTED, "");

  TAP_TEST(we.getAverageSegmentationLength(SEG_PLUS) == 88.5, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(SEG_PLUS));
  TAP_TEST(we.getAverageSegmentationLength(SEG_MINUS) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_SHORT) == 4, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_STRAND_NOT_CONSISTENT) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_ZERO) == 36, TEST_EXTRACTOR_AVG_LENGTH, "");
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_V) == 46, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_TOO_FEW_V));
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_FEW_J) == 48, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_TOO_FEW_J));
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_AMBIGUOUS) == 52.5, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_AMBIGUOUS));
  TAP_TEST(we.getAverageSegmentationLength(UNSEG_TOO_SHORT_FOR_WINDOW) == 24, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(UNSEG_TOO_SHORT_FOR_WINDOW));
  TAP_TEST(we.getAverageSegmentationLength(TOTAL_SEG_AND_WINDOW) == 71, TEST_EXTRACTOR_AVG_LENGTH, "average: " << we.getAverageSegmentationLength(TOTAL_SEG_AND_WINDOW));

  TAP_TEST(out_seg.tellp() > 0, TEST_EXTRACTOR_OUT_SEG, "");
  TAP_TEST(out_unseg.tellp() > 0, TEST_EXTRACTOR_OUT_UNSEG, "");

  delete ws;
  delete multi;
}

void testProbability() {
  string v_seq[] = {"AAAA", "AAAC", "AAAG", "AAAT", "AACA", "AACC",
                "AACG", "AACT", "AAGA", "AAGC", "AAGG", "AAGT",
                    "AATA", "AATC", "AATG", "AATT", "ACAA", "ACAC",
                "ACAG", "ACAT", "ACCA", "ACCC", "ACCG", "ACCT",
                "ACGA", "ACGC", "ACGG", "ACGT", "ACTA", "ACTC",
                "ACTG", "ACTT", "AGAA", "AGAC", "AGAG", "AGAT",
                "AGCA", "AGCC", "AGCG", "AGCT", "AGGA", "AGGC",
                "AGGG", "AGGT", "AGTA", "AGTC", "AGTG", "AGTT",
                "ATAA", "ATAC", "ATAG", "ATAT", "ATCA", "ATCC",
                "ATCG", "ATCT", "ATGA", "ATGC", "ATGG", "ATGT",
                "ATTA", "ATTC", "ATTG", "ATTT"};
  string j_seq[] = {"CAAA", "CAAC",
                "CAAG", "CAAT", "CACA", "CACC", "CACG", "CACT",
                "CAGA", "CAGC", "CAGG", "CAGT", "CATA", "CATC",
                "CATG", "CATT", "CCAA", "CCAC", "CCAG", "CCAT",
                "CCCA", "CCCC", "CCCG", "CCCT", "CCGA", "CCGC",
                "CCGG", "CCGT", "CCTA", "CCTC", "CCTG", "CCTT",
                "CGAA", "CGAC", "CGAG", "CGAT", "CGCA", "CGCC",
                "CGCG", "CGCT", "CGGA", "CGGC", "CGGG", "CGGT",
                "CGTA", "CGTC", "CGTG", "CGTT", "CTAA", "CTAC",
                "CTAG", "CTAT", "CTCA", "CTCC", "CTCG", "CTCT",
                "CTGA", "CTGC", "CTGG", "CTGT", "CTTA", "CTTC",
                "CTTG", "CTTT"};
  Fasta V, J;
  for (int i = 0; i < 64; i++) {
    Sequence v = {"V_" + string_of_int(i+33), "V" + string_of_int(i+33), v_seq[i], "", NULL, 0};
    Sequence j = {"J_" + string_of_int(i+33), "J" + string_of_int(i+33), j_seq[i], "", NULL, 0};
    V.add(v);
    J.add(j);
  }
  Germline germline("Test", 'T', V, Fasta(), J, 0);
  germline.new_index("####");


  TAP_TEST(germline.index->getIndexLoad() == .75, TEST_GET_INDEX_LOAD, "");
  TAP_TEST(germline.index->getIndexLoad(AFFECT_NOT_UNKNOWN) == .75, TEST_GET_INDEX_LOAD, ".getIndexLoad with AFFECT_NOT_UNKNOWN");
  TAP_TEST(germline.index->getIndexLoad(AFFECT_UNKNOWN) == .25, TEST_GET_INDEX_LOAD, ".getIndexLoad with AFFECT_UNKNOWN");

  Sequence seq = {"to_segment", "to_segment", "TATCG", "", NULL, 0};
  KmerSegmenter kseg(seq, &germline);

  KmerAffectAnalyser *kaa = kseg.getKmerAffectAnalyser();

  TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 3) == 0, TEST_PROBABILITY_SEGMENTATION, "");
  TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 2) == .75 * .75, TEST_PROBABILITY_SEGMENTATION, "");
  TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 1) == .75 * 2 * .25 + kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 2), TEST_PROBABILITY_SEGMENTATION, "");
  TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_NOT_UNKNOWN, 0) == 1, TEST_PROBABILITY_SEGMENTATION, "");

  TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_UNKNOWN, 3) == 0, TEST_PROBABILITY_SEGMENTATION, ".getProbabilityAtLeastOrAbove() with AFFECT_UNKOWN");
  TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_UNKNOWN, 2) == .25 * .25, TEST_PROBABILITY_SEGMENTATION, ".getProbabilityAtLeastOrAbove() with AFFECT_UNKOWN");
  TAP_TEST(kaa->getProbabilityAtLeastOrAbove(AFFECT_UNKNOWN, 0) == 1, TEST_PROBABILITY_SEGMENTATION, ".getProbabilityAtLeastOrAbove() with AFFECT_UNKOWN");
}

void testSegment() {
  testSegmentOverlap();
  testSegmentationCause();
  testExtractor();
  testProbability();
  testOverlap();
  testFineSegment();
}
