# C3a Root-authored field controls

- RED source e18e04ded59b68057624b5bb503346231070a8cc / run37569827010 / job112625700746: six new missing-control behavioral failures; old31 pass.
- GREEN source d5780374a45b837f3e06045679e63f6d7b04d602 / run37571905995 / job112632190382:37 Chromium,16 pure,4 package pass.
- red.log and green.log preserve decoded textual job output; each omits exactly5 single lines larger than8000characters containing encoded media. These are explicitly excerpts, not byte-identical raw logs; full original jobs retain media. No test failure or assertion line was omitted.
- Screenshot artifact11461720509 contains actual desktop field controls. Root inspected it and delivered Library libfile_11c4940a0efc8191a5d6eaad278160b7.
- Tests unchanged across RED/GREEN; their source snapshot is retained. No backend API or deployment.
