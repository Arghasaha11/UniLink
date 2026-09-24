const stories = [
  { name: "You", image: "https://i.pravatar.cc/100?img=12" },
  { name: "Ananya", image: "https://i.pravatar.cc/100?img=47" },
  { name: "Rohan", image: "https://i.pravatar.cc/100?img=11" },
  { name: "Ishita", image: "https://i.pravatar.cc/100?img=32" },
  { name: "Arjun", image: "https://i.pravatar.cc/100?img=13" },
];

function Stories() {
  return (
    <section className="flex w-full gap-4 overflow-x-auto border-b border-slate-200 bg-white px-[18px] pt-[14px] pb-4 md:rounded-b-2xl max-md:gap-[18px] max-md:px-[14px] max-[380px]:gap-3 lg:mb-[14px] lg:gap-[22px] lg:border-0 lg:bg-transparent lg:px-2 lg:pb-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stories.map((story) => (
        <div
          className="w-[70px] shrink-0 text-center lg:w-[76px]"
          key={story.name}
        >
          <div className="mx-auto mb-1.5 size-16 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 p-[3px] lg:size-[68px]">
            <img
              className="h-full w-full rounded-full border-[3px] border-white object-cover"
              src={story.image}
              alt={story.name}
            />
          </div>

          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-slate-900 text-[12px] lg:text-[10px]">
            {story.name}
          </p>
        </div>
      ))}
    </section>
  );
}

export default Stories;