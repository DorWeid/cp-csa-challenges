for arc in *
do
  7z e "$arc" -aoa | grep "Size"
done
