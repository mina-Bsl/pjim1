from os import listdir, path, makedirs
from os.path import isfile, join
import sys
import shutil
import gzip
import subprocess
import argparse
import shlex
import os

parser = argparse.ArgumentParser(description='Use PEAR read merger to make a new fastq file and keep unmerged reads')

parser.add_argument("file_R1", help="reverse read file")
parser.add_argument("file_R2", help="forward read file")
parser.add_argument("output_file", help="output file")
parser.add_argument("-r1", "--keep_r1", help="keep unmerged reverse reads", action="store_true")
parser.add_argument("-r2", "--keep_r2", help="keep unmerged forward reads", action="store_true")
parser.add_argument("-p", "--pear-options", help="additional options passed to PEAR", default="")


args = parser.parse_args()
f_r1 = args.file_R1
f_r2 = args.file_R2
f_out = args.output_file


subprocess.call(["pear",
 "-f", f_r1,
 "-r", f_r2,
 "-o", f_out,
 "-j", "1"]
                + shlex.split(args.pear_options)
)


try :
    with gzip.open(f_out, 'w') as outFile:
        with open(f_out+'.assembled.fastq', 'rb') as f1:
            shutil.copyfileobj(f1, outFile)
        if (args.keep_r1):
            with open(f_out+'.unassembled.reverse.fastq', 'rb') as f2:
                shutil.copyfileobj(f2, outFile)
        if (args.keep_r2):
            with open(f_out+'.unassembled.forward.fastq', 'rb') as f3:
                shutil.copyfileobj(f3, outFile)
except IOError :
    os.remove(f_out)
    raise IOError
