#!/usr/bin/env bash

if [ $# -eq 0 -o "$1" == "-h" -o "$1" == "--help" ]; then
    echo "Usage: $0 <file.should_get>

This script takes as input a .should_get file. Don't know what it is? Read this!
In the .should_get format, every line starting with a # is a comment
every line starting with a $ is a description of the test
non empty lines, must be of the following form:
<info>:<regexp>
where <regexp> is a regular expression passed to grep 
(beware to escape backslashes).
info is the number of times this regular expression should occur in the file.
the info can be prefixed by a letter either s or f or e (they can be mixed):
s: if the test fails, we skip it
f: even if the test fails, the script will not exit with an error code.
e: the pattern must be searched exactly, regexp-specific characters will 
   automatically be escaped if they're not already escaped.

The script must contain a !LAUNCH: line stating what command line to be
launched (the working directory is the directory where the input file is).  A
line starting with !LOG: is the filename used for redirecting STDOUT from the
command line. By default it is the input should_get filename where the extension 
is replaced by .log. If !OUTPUT_FILE: is provided then the program is assumed to
produce a file whose filename is given after !OUTPUT_FILE:. This file will be
parsed by the script. The !LOG: file won't be used. By default, output files
are produced in the working directory, to change this behavior, specify an
option after the option !OUTPUT_DIR:
By default spaces can be replaced by any whitespaces. You can override this by
specifying !IGNORE_WHITESPACES: 0

* Exit code
  The exit code of the launched command line is also checked. By default, an
  exit code of 0 is expected. The .should_get file can specify an option
  !EXIT_CODE: indacting another expected value.

* Requirements
  Sometimes, to launch a test some requirements must be met. If the requirements
  are not met we may want to skip the test. To do so, specify in the file
  an option !REQUIRES: which will be followed by a command that is supposed
  to exit with the error code 0. If the error code is different from 0 all the
  tests in the file will be skipped.

* Environment
** Debug
   If the environment variable DEBUG is defined, then some debug information 
   is output.
** Launcher
   If one wants to use a launcher that will execute the program, then 
   environment variable LAUNCHER must be defined, with the program name to 
   use as a launcher (eg. valgrind).
   A .should_get file may specify an option !NO_LAUNCHER: to tell that this
   must not be launched using a launcher. Also, in the !LAUNCH option, 
   $LAUNCHER may be specified if the launcher must not be put at the start
   of the command line, but somewhere else.

* Output

The output is in TAP format and consists of a file whose name is the same
as the input file, where .should_get is replaced by .tap
" >&2
    exit 1
fi

debug() {
    if [ ! -z "$DEBUG" ]; then
        echo $* >&2
    fi
}

file=$1
DIR=$(dirname $file)
BASE=$(basename $file)
cd "$DIR"

VIDJIL_DIR=../../../
DATA_DIR=../../../data/
OUTPUT_DIR=.
TAP_FILE=${BASE%.*}.tap
LOG_FILE=${BASE%.*}.log
EXPECTED_EXIT_CODE=0
EXIT_CODE=
OUTPUT_FILE=
FILE_TO_GREP=
NO_LAUNCHER=
REQUIRE=
IGNORE_WHITESPACES=1
SEPARATOR_LINE="========================================================================"

TMP_TAP_FILE=$(mktemp tap.XXXX)

{
nb_tests=0
# Count number of tests to be performed
nb_tests=`grep -Ec '^[^$#!]' $BASE`
nb_tests=$((nb_tests+1))

echo "1.."$nb_tests
test_nb=1
error=0
not_ok=$?
line_nb=1
failed_lines=()
launched=0                      # Did we launch the program yet?
cmd=
while read line; do
    if [ ! -z "$line" ]; then
        if  [ ${line:0:1} == "!" ]; then
            line=${line:1}
            type=${line%%:*}
            if [ "$type" == "LAUNCH" ]; then
                eval cmd=\"${line#*:}\"
            elif [ "$type" == "EXIT_CODE" ]; then
                EXPECTED_EXIT_CODE=${line#*:}
            elif [ "$type" == "LOG" ]; then
                eval LOG_FILE=\"${line#*:}\"
            elif [ "$type" == "OUTPUT_FILE" ]; then
                eval OUTPUT_FILE=\"${line#*:}\"
            elif [ "$type" == "OUTPUT_DIR" ]; then
                eval OUTPUT_DIR=\"${line#*:}\"
            elif [ "$type" == "NO_LAUNCHER" ]; then
                NO_LAUNCHER=1
            elif [ "$type" == "IGNORE_WHITESPACES" ]; then
                IGNORE_WHITESPACES=${line#*:}
            elif [ "$type" == "REQUIRES" ]; then
                REQUIRE=${line#*:}
            else
                echo "Unknown option $type" >&2
            fi
        elif [ ${line:0:1} == '$' ]; then
            msg=${line:1}
        else
                # This is not a comment
            if [ ${line:0:1} != '#' ]; then
                if [ $launched -eq 0 ]; then
                    if [ -z "$cmd" ]; then
                        echo "Error: you must specify a !LAUNCH: line in $file" >&2
                        exit 2
                    fi
                    # Should we use a launcher?
                    if [ ! -z "$LAUNCHER" -a -z "$NO_LAUNCHER" ]; then
                        # Yes, we should.
                        # Do we need to specify the place where LAUNCHER should be?
                        if [[ "$cmd" != *'$LAUNCHER'* && "$cmd" != *"$LAUNCHER"* ]]; then
                            cmd="$LAUNCHER ""$cmd"
                        fi
                    fi
                    echo "Launching '$cmd'" >&2
                    if [ -z "$OUTPUT_FILE" ]; then
                        eval $cmd > $LOG_FILE
                        EXIT_CODE=$?
                        FILE_TO_GREP=$LOG_FILE
                    else
                        eval $cmd > /dev/null
                        EXIT_CODE=$?
                        FILE_TO_GREP=$OUTPUT_FILE
                    fi
                    launched=1

                    TAP_FILE=$OUTPUT_DIR/$TAP_FILE
                    LOG_FILE=$OUTPUT_DIR/$LOG_FILE
                    echo "==>" $TAP_FILE >&2
                fi

                skip=0
                know_to_fail=0
                exact=0

                pattern=$(cut -d: -f2- <<< "$line")
                nb_hits=$(cut -d: -f1 <<< "$line")

                # Escape special characters for sed
                pattern=$(sed -e 's/[/&]/\\&/g' <<< $pattern)

                while ! [ "${nb_hits:0:1}" -eq "${nb_hits:0:1}" ] 2> /dev/null; do
                    case ${nb_hits:0:1} in
                        "s") 
                            skip=1;;  # We skip the test if it fails
                        "f") 
                            know_to_fail=1;; # We know the test fails, but don't fail globally
                        "e")
                            # Exact: protect any character that may be part of
                            # a regex
                            pattern=$(sed -r 's/([^\\])(\.|\||\-|\+|\*|\[|\]|\(|\)|\{|\})/\1\\\2/g' <<< $pattern);;
                    esac
                    nb_hits=${nb_hits:1}
                done

                if ! eval $REQUIRE > /dev/null 2> /dev/null; then 
                    skip=1
                fi

                # Replace whitespaces if needed
                if [ $IGNORE_WHITESPACES -ne 0 ]; then
                    pattern=$(sed -r 's/[[:space:]]+/[[:space:]]+/g' <<< $pattern)
                fi

                debug "Grepping \"$pattern\" in $FILE_TO_GREP"
                if [ $(sed -rn "/$pattern/p" < $FILE_TO_GREP | wc -l) -eq $nb_hits -o $skip -eq 1 ]; then
                    if [ $know_to_fail -eq 1 ]; then
                        echo "Warning: test $test_nb should have failed, but has not!" >&2
                    fi
                    echo -n "ok"
                else
                    echo -n "not ok"
                    if [ $know_to_fail -eq 0 ]; then
                        error=1
			echo >&2; echo >&2; echo $SEPARATOR_LINE >&2
			echo "$file failed:" >&2
			echo "$line" >&2
			echo $SEPARATOR_LINE >&2
			cat $FILE_TO_GREP >&2
			echo $SEPARATOR_LINE >&2; echo >&2; echo >&2
                    fi
                fi
                echo -n " "$test_nb" "
                if [ $skip -eq 1 ]; then
                    echo -n "# SKIP "
                fi
                if [ $know_to_fail -eq 1 ]; then
                    echo -n "# TODO "
                fi
                echo "- " $msg
                test_nb=$((test_nb+1))
            fi
        fi
    fi
    line_nb=$((line_nb+1))

done < $BASE

# Check exit code
if [ $EXIT_CODE -eq $EXPECTED_EXIT_CODE ]; then
    echo "ok $test_nb -  Exit code $EXIT_CODE"
else
    echo -n "not ok $test_nb "

    if ! eval $REQUIRE > /dev/null 2> /dev/null; then
        echo -n "# SKIP "
    else

    error=1

    echo >&2; echo >&2; echo $SEPARATOR_LINE >&2
    echo "error: exit code $EXIT_CODE (expected $EXPECTED_EXIT_CODE)" >&2
    echo $SEPARATOR_LINE >&2
    cat $FILE_TO_GREP >&2
    echo $SEPARATOR_LINE >&2;  echo >&2; echo >&2

    fi
    echo "-  Exit code $EXIT_CODE"
fi

} > $TMP_TAP_FILE

mv $TMP_TAP_FILE $TAP_FILE
echo >&2
exit $error
