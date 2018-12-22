for arc in *
do
 unrar v "$arc" fname -o+ | head -4 | tail -1 | awk -v file="$arc" '{print substr($1,1,7),file}'
done
