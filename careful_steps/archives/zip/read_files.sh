for arc in *
do
  7z e "$arc" -aoa | grep "Comment" | awk -v file="$arc" '{print substr($3,1,7),file}'
done
